import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { ValidationException } from "../../exception/validationException";
import { OneIdentityAwsSecretObject } from "../../models/Aws";
import type { OidcStateData } from "../../models/OidcState";
import { auditLog } from "../../utils/AuditLog";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { retrieveEnvVariable } from "../../config";
import { getOidcStateRedisKey } from "../../utils/Constants";
import { RequestEventBody } from "./models/Event";
import { TokenExchangeResponse } from "./models/Token";
import { getAWSSecret } from "./utils/AwsParameters";
import { exchangeOneIdentityCode } from "./utils/OneIdentity";
import { generateTokenExchangeResponse } from "./utils/Responses";
import { generateSourceObject } from "./utils/TokenGenerator";
import { validateOneIdentityIdToken } from "./validation/TokenValidation";

// Module-level variable: persists across warm Lambda invocations, avoiding a Secrets Manager call on every request.
// On cold start it is undefined and gets populated on the first invocation.
let cachedOneIdentityCredentials: OneIdentityAwsSecretObject | undefined;
export const clearCredentialsCache = () => {
  cachedOneIdentityCredentials = undefined;
};

export const oidcTokenHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;
  const eventOrigin = event.headers?.origin!;

  // The body is already validated by API Gateway, so we can safely parse it
  // See OidcModal schema in microservice.yaml for the expected structure of the body
  const requestBody: RequestEventBody = JSON.parse(event.body!);
  const { code, state } = requestBody;

  await RedisHandler.connectRedis();
  let stateData: OidcStateData | null;
  try {
    stateData = await RedisHandler.getJson<OidcStateData>(getOidcStateRedisKey(state));
  } finally {
    await RedisHandler.disconnectRedis();
  }

  if (!stateData) {
    auditLog({
      message: "Oidc state not found",
      aud_orig: eventOrigin,
      status: "KO",
      request_id,
    }).warn("error");
    return generateKoResponse(new ValidationException("Oidc state not found"), eventOrigin);
  }

  const { nonce } = stateData;

  try {
    if (!cachedOneIdentityCredentials) {
      const oneIdentitySecretName = retrieveEnvVariable("ONE_IDENTITY_SECRET_NAME");
      cachedOneIdentityCredentials = await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);
    }
    const oneIdentityCredentials = cachedOneIdentityCredentials;
    const redirectUri = retrieveEnvVariable("ONE_IDENTITY_REDIRECT_URI");

    const oneIdentityToken = await exchangeOneIdentityCode({
      code,
      redirectUri,
      oneIdentityCredentials,
    });

    const decodedIdToken = await validateOneIdentityIdToken({
      oneIdentityIdToken: oneIdentityToken.id_token,
      nonce,
      oneIdentityClientId: oneIdentityCredentials.oneIdentityClientId,
    });

    const sourceResponse = await generateSourceObject(stateData);

    const response = await generateTokenExchangeResponse({
      decodedIdToken,
      state,
      source: sourceResponse,
    });

    auditLog({
      message: `Token successful generated with id: ${state}`,
      aud_orig: eventOrigin,
      status: "OK",
      cx_type: "PF",
      cx_id: `PF-${decodedIdToken.pairwise}`,
      uid: decodedIdToken.pairwise,
      jti: state,
      request_id,
    }).info("success");

    return generateOkResponse<TokenExchangeResponse>(response, eventOrigin);
  } catch (err: any) {
    const log = auditLog({
      message: `Error generating token: ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
      request_id,
    });

    if (err instanceof ValidationException) {
      log.warn("error");
    } else {
      log.error("error");
    }
    return generateKoResponse(err, eventOrigin);
  } finally {
    console.debug("Deleting state in Redis for state: ", state);
    await RedisHandler.connectRedis()
      .then(() => RedisHandler.del(getOidcStateRedisKey(state)))
      .then(() => RedisHandler.disconnectRedis())
      .catch((e) => console.warn("Failed to invalidate state key", e));
  }
};
