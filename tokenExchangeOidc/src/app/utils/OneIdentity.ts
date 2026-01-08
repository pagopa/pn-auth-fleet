import { OneIdentityToken } from "../../models/Token";
import { getAWSSecret } from "./AwsParameters";

/**
 * Exchanges a OneIdentity authorization code for a OneIdentity token.
 */
export const exchangeOneIdentityCode = async (
  code: string,
  redirect_uri: string
): Promise<OneIdentityToken> => {
  const oidcClientId = process.env.ONE_IDENTITY_CLIENT_ID;
  const oidcClientSecretId = process.env.ONE_IDENTITY_CLIENT_SECRET_ID;

  if (!oidcClientId) {
    throw new Error("ONE_IDENTITY_CLIENT_ID is not set");
  }

  if (!oidcClientSecretId) {
    throw new Error("ONE_IDENTITY_CLIENT_SECRET_ID is not set");
  }

  const getOidcSecretKey = await getAWSSecret(oidcClientSecretId);

  const credentials = Buffer.from(
    `${oidcClientId}:${getOidcSecretKey}`
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
    throw new Error(`Error exchanging code: ${response.statusText}`);
  }

  console.info("One Identity Code exchanged successfully");

  const data: OneIdentityToken = await response.json();
  return data;
};

// const getOneIdentityKeys = async (): Promise<Jwks> => {}
