import axios from "axios";
import { ValidationException } from "../../../exception/validationException";
import { OneIdentityAwsSecretObject } from "../../../models/Aws";
import { retrieveEnvVariable } from "../../../config";
import { OIExchangeCodeResponse } from "../models/Token";

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
    `${encodeURIComponent(oneIdentityClientId)}:${encodeURIComponent(
      oneIdentityClientSecret
    )}`,
    "utf8"
  ).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  try {
    const response = await axios.post<OIExchangeCodeResponse>(
      `${oneIdentityBaseUrl}/oidc/token`,
      body.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    console.info("One Identity Code exchanged successfully");
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const errorMessage = `Error during code exchange with OneIdentity: ${err.response.data}`;
      if (err.response.status === 400) {
        throw new ValidationException(errorMessage);
      }
      throw new Error(errorMessage);
    }
    throw err;
  }
};
