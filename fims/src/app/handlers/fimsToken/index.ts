import { randomUUID } from "node:crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { LollipopValidationError, RedisHandler, validateLollipop } from "pn-auth-common";
import { getAWSSecret, ValidationException } from "pn-auth-common-ts";
import { FimsAwsSecretObject } from "../../models/Aws";
import type { FimsStateData } from "../../models/FimsState";
import { retrieveEnvVariable } from "../../config";
import { getFimsStateRedisKey, getFimsSessionRedisKey } from "../../utils/Constants";
import { generateKoResponse, generateRedirectResponse } from "../../utils/Responses";
import { exchangeFimsCode } from "./utils/Fims";
import { getFimsUserInfo } from "./utils/UserInfo";
import { validateFimsIdToken } from "./validation/TokenValidation";
import { FimsSessionData, FimsTokenRequestBody } from "../../models/FimsToken";
import { auditLog } from "../../utils/AuditLog";

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
      return generateKoResponse("Invalid issuer");
    }

    // 2. Retrieve nonce from Redis (implicitly validates state)
    let nonce: string;
    await RedisHandler.connectRedis();
    try {
      const stateData = await RedisHandler.getJson<FimsStateData>(getFimsStateRedisKey(state));
      if (!stateData) {
        throw new Error("Fims state not found");
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
    console.debug("FIMS user info received", { assertionRef: userInfo.assertion_ref });

    // 6. Validate the Lollipop proof of possession before creating a SEND session/handoff.
    await validateLollipop({
      assertion: userInfo.assertion,
      assertionRef: userInfo.assertion_ref,
      publicKey: userInfo.public_key,
      fiscalCode: userInfo.fiscal_code,
      headers: event.headers,
      expectedNonce: state,
      expectedSignedHeaders: {
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

    // 7. Store a one-time session in Redis and redirect the frontend with the opaque fimsId.
    const fimsId = randomUUID();
    const sessionData: FimsSessionData = {
      family_name: userInfo.family_name ?? "",
      given_name: userInfo.given_name ?? "",
      fiscal_code: userInfo.fiscal_code,
    };
    const sessionTtl = Number(retrieveEnvVariable("FIMS_REDIS_STATE_TTL"));
    await RedisHandler.connectRedis();
    try {
      await RedisHandler.setJson(getFimsSessionRedisKey(fimsId), sessionData, { EX: sessionTtl });
    } finally {
      await RedisHandler.disconnectRedis();
    }

    auditLog({
      message: `Fims token successful verified and session created with fimsId: ${fimsId}`,
      status: "OK",
      cx_type: "PF",
      jti: state,
      request_id,
    }).info("success");

    const frontendBaseUrl = retrieveEnvVariable("FIMS_FRONTEND_BASEURL");
    return generateRedirectResponse(`${frontendBaseUrl}#fimsId=${fimsId}`);
  } catch (err) {
    const responseError = err instanceof LollipopValidationError ? new ValidationException("Invalid FIMS callback") : (err as Error);

    auditLog({ message: `fims-token error: ${responseError.message}`, status: "KO", request_id }).error("error");
    return generateKoResponse(responseError);
  }
};
