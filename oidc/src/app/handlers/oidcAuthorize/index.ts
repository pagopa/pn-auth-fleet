import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { OneIdentityAwsSecretObject } from "../oidcToken/models/Aws";
import { getAWSSecret } from "../oidcToken/utils/AwsParameters";
import { generateRedirectResponse } from "../../utils/Responses";
import { generateRandomUniqueString, retrieveEnvVariable } from "../../utils/String";

export const oidcAuthorizeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventOrigin = event.headers.origin!;
  const idp = event.queryStringParameters?.idp!; // idp is required and validated by API Gateway configuration: method.request.querystring.idp

  const oneIdentitySecretName = retrieveEnvVariable("ONE_IDENTITY_SECRET_NAME");
  const { oneIdentityClientId } = await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

  const oneIdentityBaseUrl = retrieveEnvVariable("ONE_IDENTITY_BASEURL");
  const redirectUri = retrieveEnvVariable("ONE_IDENTITY_REDIRECT_URI");

  const state = generateRandomUniqueString();
  const nonce = generateRandomUniqueString();

  const location = `${oneIdentityBaseUrl}/oidc/authorize?idp=${idp}&client_id=${oneIdentityClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid&nonce=${nonce}&state=${state}`;

  return generateRedirectResponse(location, eventOrigin);
};
