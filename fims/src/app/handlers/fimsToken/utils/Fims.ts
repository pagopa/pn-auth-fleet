import axios from "axios";
import { ValidationException } from "pn-auth-common-ts";
import { FimsAwsSecretObject } from "../../../models/Aws";
import { retrieveEnvVariable } from "../../../config";
import { FimsTokenResponse } from "../../../models/FimsToken";

type ExchangeFimsCodeProps = {
  code: string;
  state: string;
  fimsCredentials: FimsAwsSecretObject;
};

/**
 * Exchanges a FIMS authorization code for FIMS tokens.
 * @param code - The FIMS authorization code to exchange
 * @param state - The state parameter from the authorization response
 * @param fimsCredentials - FIMS credentials used to authenticate
 */
export const exchangeFimsCode = async ({
  code,
  state,
  fimsCredentials,
}: ExchangeFimsCodeProps): Promise<FimsTokenResponse> => {
  const { fimsClientId, fimsClientSecret } = fimsCredentials;
  const fimsBaseUrl = retrieveEnvVariable("FIMS_BASEURL");
  const redirectUri = retrieveEnvVariable("FIMS_REDIRECT_URI");

  const credentials = Buffer.from(`${fimsClientId}:${fimsClientSecret}`, "utf8").toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    state,
  });

  try {
    const response = await axios.post<FimsTokenResponse>(`${fimsBaseUrl}/token`, body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
    });
    console.info("FIMS code exchanged successfully");
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      // err.response.data is often a JSON object; serialize it so the real FIMS
      // error is visible instead of "[object Object]".
      const data =
        typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
      const errorMessage = `Error during code exchange with FIMS (status ${err.response.status}): ${data}`;
      if (err.response.status === 400) {
        throw new ValidationException(errorMessage);
      }
      throw new Error(errorMessage);
    }
    throw err;
  }
};
