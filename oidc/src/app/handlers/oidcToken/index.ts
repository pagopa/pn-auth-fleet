import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ValidationException } from "../../exception/validationException";
import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { auditLog } from "../../utils/AuditLog";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { retrieveEnvVariable } from "../../utils/String";
import { RequestEventBody } from "./models/Event";
import { TokenExchangeResponse } from "./models/Token";
import { getAWSSecret } from "./utils/AwsParameters";
import { exchangeOneIdentityCode } from "./utils/OneIdentity";
import { generateTokenExchangeResponse } from "./utils/Responses";
import { generateSourceObject } from "./utils/TokenGenerator";
import { validateOneIdentityIdToken } from "./validation/TokenValidation";

export const oidcTokenHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventOrigin = event.headers?.origin!;

  // The body is already validated by API Gateway, so we can safely parse it
  // See OidcModal schema in microservice.yaml for the expected structure of the body
  const requestBody: RequestEventBody = JSON.parse(event.body!);
  const { code, nonce, state, source } = requestBody;

  try {
    const oneIdentitySecretName = retrieveEnvVariable("ONE_IDENTITY_SECRET_NAME");

    const oneIdentityCredentials = await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

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

    const sourceResponse = await generateSourceObject(source);

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
    }).info("success");

    return generateOkResponse<TokenExchangeResponse>(response, eventOrigin);
  } catch (err: any) {
    const log = auditLog({
      message: `Error generating token: ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    });

    if (err instanceof ValidationException) {
      log.warn("error");
    } else {
      log.error("error");
    }
    return generateKoResponse(err, eventOrigin);
  }
};
