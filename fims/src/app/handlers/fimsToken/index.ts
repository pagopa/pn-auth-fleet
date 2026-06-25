import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { getAWSSecret } from "pn-auth-common-ts";
import { FimsAwsSecretObject } from "../../models/Aws";
import type { FimsStateData } from "../../models/FimsState";
import { retrieveEnvVariable } from "../../config";
import { getFimsStateRedisKey } from "../../utils/Constants";
import { generateKoResponse } from "../../utils/Responses";
import { auditLog } from "../../utils/AuditLog";
import { exchangeFimsCode } from "./utils/Fims";
import { validateFimsIdToken } from "./validation/TokenValidation";
import { FimsTokenRequestBody } from "../../models/FimsToken";

const fimsIssuerUrl = retrieveEnvVariable("FIMS_ISSUER_URL");
const fimsSecretName = retrieveEnvVariable("FIMS_SECRET_NAME");

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

    auditLog({
      message: "Token exchange successful",
      status: "OK",
      jti: state,
      request_id,
    }).info("info");

    // TODO: call UserInfo endpoint
    // TODO: checkAssertion + checkLollipop

    return {
      statusCode: 200,
      headers: { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" },
      body: JSON.stringify({ access_token: tokens.access_token }),
      isBase64Encoded: false,
    };
  } catch (err) {
    auditLog({ message: `fims-token error: ${(err as Error).message}`, status: "KO", request_id }).error("error");
    return generateKoResponse(err as Error);
  }
};
