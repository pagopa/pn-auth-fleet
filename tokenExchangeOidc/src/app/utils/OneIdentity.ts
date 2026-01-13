import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { OIExchangeCodeResponse } from "../../models/Token";

type ExchangeOneIdentityCodeProps = {
  code: string;
  redirectUri: string;
  oneIdentityCredentials: OneIdentityAwsSecretObject;
};

/**
 * Exchanges a OneIdentity authorization code for a OneIdentity token.
 * @param code - The OneIdentity code to exchange
 * @redirectUri - The redirect URI to pass in the request body
 * @oneIdentityCredentials - One Identity credentials used to authenticate
 */
export const exchangeOneIdentityCode = async ({
  code,
  redirectUri,
  oneIdentityCredentials,
}: ExchangeOneIdentityCodeProps): Promise<OIExchangeCodeResponse> => {
  const { oneIdentityClientId, oneIdentityClientSecret } =
    oneIdentityCredentials;

  const credentials = Buffer.from(
    `${oneIdentityClientId}:${oneIdentityClientSecret}`
  ).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(
    `${process.env.ONE_IDENTITY_BASEURL}/oidc/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error during code exchange with OneIdentity: ${response.statusText}`
    );
  }

  console.info("One Identity Code exchanged successfully");

  const data: OIExchangeCodeResponse = await response.json();
  return data;
};
