import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { LollipopValidationError, maskString, RedisHandler, validateLollipop } from "pn-auth-common";
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
import { FimsTokenRequestBody } from "../../models/FimsToken";
import { auditLog } from "../../utils/AuditLog";

// Module-level variable: persists across warm Lambda invocations, avoiding a Secrets Manager call on every request.
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

  let cxId: string | undefined;

  try {
    const { code, state, iss } = (event.queryStringParameters ??
      {}) as unknown as FimsTokenRequestBody;

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
    console.debug("FIMS user info received", { assertionRef: maskString(userInfo.assertion_ref) });

    // 6. Validate the Lollipop proof of possession before creating a SEND session/handoff.
    await validateLollipop({
      assertion: userInfo.assertion,
      assertionRef: userInfo.assertion_ref,
      publicKey: userInfo.public_key,
      fiscalCode: userInfo.fiscal_code,
      headers: event.headers,
      expectedNonce: state,
      expectedSignedHeaders: {
        "x-pagopa-lollipop-original-method": "GET",
        "x-pagopa-lollipop-custom-code": code,
        "x-pagopa-lollipop-custom-state": state,
        "x-pagopa-lollipop-custom-iss": iss,
      },
      assertionExpireInDays: Number(retrieveEnvVariable("ASSERTION_EXPIRE_IN_DAYS", "365")),
      idpConfig: {
        baseUrl: retrieveEnvVariable("IDP_CONFIG_BASE_URI"),
        cieEntityIds: retrieveEnvVariable("IDP_CLIENT_CIEIDD")
          .split(";")
          .map((entityId) => entityId.trim())
          .filter(Boolean),
        timeoutMs: Number(retrieveEnvVariable("IDP_HTTP_TIMEOUT_MS", "10000")),
      },
    });

    // 7. Resolve the internal cx id (uid) from pn-data-vault, then sign a
    // self-contained session token (KMS/RS256) and redirect the frontend.
    cxId = await getCxId(userInfo.fiscal_code);
    const uid = cxId.replace("PF-", ""); // Remove the "PF-" prefix from the cxId
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
      cx_id: cxId,
      jti: state,
      request_id,
    }).info("success");

    const frontendBaseUrl = retrieveEnvVariable("FIMS_FRONTEND_BASEURL");

    const redirectUrl = new URL(frontendBaseUrl);
    redirectUrl.searchParams.set("utm_source", "ioapp");
    redirectUrl.searchParams.set("utm_medium", "app");
    redirectUrl.searchParams.set("utm_campaign", "visita_send");
    redirectUrl.hash = `fimsToken=${fimsToken}`;

    return generateRedirectResponse(redirectUrl.toString());
  } catch (err) {
    const responseError = err instanceof LollipopValidationError ? new ValidationException("Lollipop validation failed") : (err as Error);

    const auditMessage = err instanceof LollipopValidationError
        ? `fims-token Lollipop validation failed [${err.errorCode}]: ${err.message}`
        : `fims-token error: ${responseError.message}`;

    auditLog({ message: auditMessage, status: "KO", cx_id: cxId, request_id }).error("error");

    return generateKoResponse(responseError);
  }
};
