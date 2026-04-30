import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { auditLog } from "../../utils/AuditLog";
import { generateRedirectResponse } from "../../utils/Responses";
import { generateRandomUniqueString, retrieveEnvVariable } from "../../utils/String";
import { getAWSSecret } from "../oidcToken/utils/AwsParameters";

const REDIS_STATE_PREFIX = "oidc::";
const REDIS_STATE_TTL_SEC = 300;

export const oidcAuthorizeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventOrigin = event.headers.origin!;
  const {
    idp, // required, validated by API Gateway: method.request.querystring.idp
    aar,
    retrievalId,
  } = event.queryStringParameters as { idp: string; aar?: string; retrievalId?: string };

  const oneIdentitySecretName = retrieveEnvVariable("ONE_IDENTITY_SECRET_NAME");
  const { oneIdentityClientId } = await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

  const oneIdentityBaseUrl = retrieveEnvVariable("ONE_IDENTITY_BASEURL");
  const redirectUri = retrieveEnvVariable("ONE_IDENTITY_REDIRECT_URI");

  const state = generateRandomUniqueString();
  const nonce = generateRandomUniqueString();

  await RedisHandler.connectRedis();
  try {
    await RedisHandler.setJson(
      `${REDIS_STATE_PREFIX}${state}`,
      { nonce, idp, aar, retrievalId },
      { EX: REDIS_STATE_TTL_SEC },
    );
  } finally {
    await RedisHandler.disconnectRedis();
  }

  const location = `${oneIdentityBaseUrl}/oidc/authorize?idp=${encodeURIComponent(idp)}&client_id=${oneIdentityClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid&nonce=${nonce}&state=${state}`;

  auditLog({
    message: `Redirecting to One Identity for authorization, idp: ${idp}`,
    aud_orig: eventOrigin,
    status: "OK",
    cx_type: "PF",
    jti: state,
  }).info("success");

  return generateRedirectResponse(location, eventOrigin);
};
