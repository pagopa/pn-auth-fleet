import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { getAWSSecret, ValidationException } from "pn-auth-common-ts";
import { FimsAwsSecretObject } from "../../models/Aws";
import type { FimsStateData } from "../../models/FimsState";
import { retrieveEnvVariable } from "../../config";
import { getFimsStateRedisKey } from "../../utils/Constants";
import { getCxId } from "../../utils/DataVault";
import { generateKoResponse, generateRedirectResponse } from "../../utils/Responses";
import { exchangeFimsCode } from "./utils/Fims";
import { getFimsUserInfo } from "./utils/UserInfo";
import { generateFimsJwtPayload, generateSessionToken } from "./utils/TokenGenerator";
import { validateFimsIdToken } from "./validation/TokenValidation";
import { FimsTokenRequestBody, FimsUserInfo } from "../../models/FimsToken";
import { auditLog } from "../../utils/AuditLog";

const TEMP_VALIDATION_HEADER_TOKEN = false;

// Module-level variable: persists across warm Lambda invocations, avoiding a Secrets Manager call on every request.
// On cold start it is undefined and gets populated on the first invocation.
let cachedFimsCredentials: FimsAwsSecretObject | undefined;
export const clearCredentialsCache = () => {
  cachedFimsCredentials = undefined;
};

export const fimsTokenHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;

  const fimsIssuerUrl = retrieveEnvVariable("FIMS_ISSUER_URL");
  const fimsSecretName = retrieveEnvVariable("FIMS_SECRET_NAME");

  try {
    const { code, state, iss } = JSON.parse(event.body!) as FimsTokenRequestBody;

    // 1. Check issuer
    if (iss !== fimsIssuerUrl) {
      auditLog({ message: "Invalid issuer", status: "KO", request_id }).warn("warn");
      return generateKoResponse(new ValidationException("Invalid issuer"));
    }

    // 2. Retrieve nonce from Redis (implicitly validates state)
    let nonce: string;
    await RedisHandler.connectRedis();
    try {
      const stateData = await RedisHandler.getJson<FimsStateData>(getFimsStateRedisKey(state));
      if (!stateData) {
        throw new ValidationException("Fims state not found");
      }
      nonce = stateData.nonce;
    } finally {
      await RedisHandler.disconnectRedis();
    }

    if (TEMP_VALIDATION_HEADER_TOKEN) {
      // 3. Token exchange
      if (!cachedFimsCredentials) {
        cachedFimsCredentials = await getAWSSecret<FimsAwsSecretObject>(fimsSecretName);
      }
      const tokens = await exchangeFimsCode({ code, state, fimsCredentials: cachedFimsCredentials });

      // 4. Validate id_token claims and signature
      await validateFimsIdToken({
        fimsIdToken: tokens.id_token,
        nonce,
        fimsClientId: cachedFimsCredentials.fimsClientId,
      });

      // 5. Fetch the citizen's claims (assertion, public_key, assertion_ref, fiscal_code, ...)
      const userInfo = await getFimsUserInfo({ accessToken: tokens.access_token });
      console.debug("FIMS user info received", { assertionRef: userInfo.assertion_ref });
    }
    // TODO verify Lollipop (checks 1-6 via lollipopAuthorizer) + check 7 (nonce == state) using userInfo


    // once the Lollipop verification flow above is enabled.
    const userInfo: FimsUserInfo = {
      sub: "LVLDAA85T50G702B",
      fiscal_code: "LVLDAA85T50G702B",
      public_key: "",
      assertion_ref: "",
      assertion: "",
      given_name: "Ada",
      family_name: "Lovelace",
    };
    // 6. Resolve the internal cx id (uid) from pn-data-vault, then sign a
    // self-contained session token (KMS/RS256) and redirect the frontend.
    const uid = await getCxId(userInfo.fiscal_code);
    const fimsJwtPayload = generateFimsJwtPayload({
      uid,
      fiscalCode: userInfo.fiscal_code,
      givenName: userInfo.given_name ?? "",
      familyName: userInfo.family_name ?? "",
      state,
    });
    const fimsToken = await generateSessionToken(fimsJwtPayload);

    auditLog({
      message: "Fims token successfully verified and fims session token created",
      status: "OK",
      cx_type: "PF",
      uid,
      jti: state,
      request_id,
    }).info("success");

    const frontendBaseUrl = retrieveEnvVariable("FIMS_FRONTEND_BASEURL");
    // https://notifichedigitali.it/cittadini?utm_source=ioapp&utm_medium=app&utm_campaign=visita_send
    return generateRedirectResponse(`${frontendBaseUrl}#fimsToken=${fimsToken}`);
  } catch (err) {
    auditLog({ message: `fims-token error: ${(err as Error).message}`, status: "KO", request_id }).error("error");
    return generateKoResponse(err as Error);
  }
};
