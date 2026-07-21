import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { FimsAwsSecretObject } from "../../models/Aws";
import type { FimsStateData } from "../../models/FimsState";
import { generateRedirectResponse } from "../../utils/Responses";
import { retrieveEnvVariable } from "../../config";
import { generateRandomUniqueString, getAWSSecret } from "pn-auth-common-ts";
import { getFimsStateRedisKey } from "../../utils/Constants";
import { auditLog } from "../../utils/AuditLog";

// FIMS scope requested to the OAuth provider.
const FIMS_SCOPE = "openid profile lollipop";

export const fimsAuthorizeHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;

  const fimsSecretName = retrieveEnvVariable("FIMS_SECRET_NAME");
  const redisStateTtlSec = Number(retrieveEnvVariable("FIMS_REDIS_STATE_TTL"));
  const fimsBaseUrl = retrieveEnvVariable("FIMS_BASEURL");
  const redirectUri = retrieveEnvVariable("FIMS_REDIRECT_URI");

  const { fimsClientId } = await getAWSSecret<FimsAwsSecretObject>(fimsSecretName);

  const state = generateRandomUniqueString();
  const nonce = generateRandomUniqueString();

  await RedisHandler.connectRedis();
  try {
    await RedisHandler.setJson<FimsStateData>(
      getFimsStateRedisKey(state),
      { nonce },
      { EX: redisStateTtlSec },
    );
  } finally {
    await RedisHandler.disconnectRedis();
  }

  const location =
    `${fimsBaseUrl}/authorize` +
    `?client_id=${encodeURIComponent(fimsClientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(FIMS_SCOPE)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&nonce=${nonce}`;

  auditLog({
    message: "Return redirect to FIMS OAuth provider for authorization",
    status: "OK",
    cx_type: "PF",
    jti: state,
    request_id,
  }).info("success");

  return generateRedirectResponse(location);
};
