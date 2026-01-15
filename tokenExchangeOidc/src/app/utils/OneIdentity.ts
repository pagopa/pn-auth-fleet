import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { OIExchangeCodeResponse } from "../../models/Token";
import { ValidationException } from "../exception/validationException";
import { retrieveEnvVariable } from "./String";

type ExchangeOneIdentityCodeProps = {
  code: string;
  redirectUri: string;
  oneIdentityCredentials: OneIdentityAwsSecretObject;
};

/**
 * Exchanges a OneIdentity authorization code for a OneIdentity token.
 * @param code - The OneIdentity code to exchange
 * @param redirectUri - The redirect URI to pass in the request body
 * @param oneIdentityCredentials - One Identity credentials used to authenticate
 */
export const exchangeOneIdentityCode = async ({
  code,
  redirectUri,
  oneIdentityCredentials,
}: ExchangeOneIdentityCodeProps): Promise<OIExchangeCodeResponse> => {
  const { oneIdentityClientId, oneIdentityClientSecret } =
    oneIdentityCredentials;
  const oneIdentityBaseUrl = retrieveEnvVariable("ONE_IDENTITY_BASEURL");

  const credentials = Buffer.from(
    `${oneIdentityClientId}:${oneIdentityClientSecret}`
  ).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${oneIdentityBaseUrl}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const errorMessage = `Error during code exchange with OneIdentity: ${responseBody}`;

    if (response.status === 400) {
      throw new ValidationException(errorMessage);
    }

    throw new Error(errorMessage);
  }

  console.info("One Identity Code exchanged successfully");

  const data: OIExchangeCodeResponse = await response.json();
  return data;
};
