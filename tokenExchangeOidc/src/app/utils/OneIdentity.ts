import { OneIdentityAwsSecretObject } from "../../models/Aws";
import { OIExchangeCodeResponse } from "../../models/Token";

/**
 * Exchanges a OneIdentity authorization code for a OneIdentity token.
 */
export const exchangeOneIdentityCode = async (
  code: string,
  redirect_uri: string,
  oneIdentityCredentials: OneIdentityAwsSecretObject
): Promise<OIExchangeCodeResponse> => {
  const { oneIdentityClientId, oneIdentityClientSecret } =
    oneIdentityCredentials;

  const credentials = Buffer.from(
    `${oneIdentityClientId}:${oneIdentityClientSecret}`
  ).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri,
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
