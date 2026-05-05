import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { retrieveEnvVariable } from "../../config";
import { generateRandomUniqueString } from "../../utils/String";
import { getAWSSecret } from "../oidcToken/utils/AwsParameters";
import { getOidcStateRedisKey } from "../../utils/Constants";
import { auditLog } from "../../utils/AuditLog";
import { validateAar, validateIdp, validateRetrievalId } from "./validation/AuthorizeValidation";
import { ValidationException } from "../../exception/validationException";

export const oidcAuthorizeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventOrigin = event.headers.origin!;
  const {
    idp, // required, validated by API Gateway: method.request.querystring.idp
    aar,
    retrievalId,
  } = event.queryStringParameters as { idp: string; aar?: string; retrievalId?: string };

  try {
    validateIdp(idp);
    if (aar) validateAar(aar);
    if (retrievalId) validateRetrievalId(retrievalId);
  } catch (err) {
    if (err instanceof ValidationException) {
      return generateKoResponse(err, eventOrigin);
    }
    throw err;
  }

  const oneIdentitySecretName = retrieveEnvVariable("ONE_IDENTITY_SECRET_NAME");
  const redisStateTtlSec = Number(retrieveEnvVariable("ONE_IDENTITY_REDIS_STATE_TTL"));
  const { oneIdentityClientId } = await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

  const oneIdentityBaseUrl = retrieveEnvVariable("ONE_IDENTITY_BASEURL");
  const redirectUri = retrieveEnvVariable("ONE_IDENTITY_REDIRECT_URI");

  const state = generateRandomUniqueString();
  const nonce = generateRandomUniqueString();

  await RedisHandler.connectRedis();
  try {
    await RedisHandler.setJson(getOidcStateRedisKey(state), { nonce, idp, aar, retrievalId }, { EX: redisStateTtlSec });
  } finally {
    await RedisHandler.disconnectRedis();
  }

  const location = `${oneIdentityBaseUrl}/oidc/authorize?idp=${encodeURIComponent(idp)}&client_id=${oneIdentityClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid&nonce=${nonce}&state=${state}`;

  auditLog({
    message: `Return redirect to One Identity for authorization, idp: ${idp}`,
    aud_orig: eventOrigin,
    status: "OK",
    cx_type: "PF",
    jti: state,
  }).info("success");

  return generateOkResponse<{ location: string }>({ location }, eventOrigin);
};
