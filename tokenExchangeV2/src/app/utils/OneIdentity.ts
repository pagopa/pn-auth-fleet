import { OneIdentityToken } from "../../models/Token";

/**
 * Exchanges a OneIdentity authorization code for a OneIdentity token.
 */
export const exchangeOneIdentityCode = async (
  code: string,
  redirect_uri: string
): Promise<OneIdentityToken> => {
  const oidcClientId = process.env.ONE_IDENTITY_CLIENT_ID;
  const oidcClientSecret = process.env.ONE_IDENTITY_CLIENT_SECRET_ID;

  if (!oidcClientId) {
    throw new Error("ONE_IDENTITY_CLIENT_ID is not set");
  }

  if (!oidcClientSecret) {
    throw new Error("ONE_IDENTITY_CLIENT_SECRET_ID is not set");
  }

  const getOidcSecretKey = await getSecretValue(oidcClientSecret);

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

// TODO - Capire se possiamo usare @aws-sdk/client-secrets-manager e in caso spostiamo la funzione in un file dedicato
const getSecretValue = async (secretName: string): Promise<string> =>
  new Promise((resolve) => resolve("test_secret"));
