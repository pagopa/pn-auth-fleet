import axios from "axios";
import { retrieveEnvVariable } from "../../../config";
import { FimsUserInfo } from "../../../models/FimsToken";

type GetFimsUserInfoProps = {
  accessToken: string;
};

/**
 * Retrieves the citizen's claims from the FIMS UserInfo endpoint. The returned
 * `assertion`, `public_key` and `assertion_ref` are the inputs to the Lollipop
 * Proof-of-Possession verification.
 * @param accessToken - The access token returned by the token exchange
 */
export const getFimsUserInfo = async ({
  accessToken,
}: GetFimsUserInfoProps): Promise<FimsUserInfo> => {
  const fimsBaseUrl = retrieveEnvVariable("FIMS_BASEURL");

  try {
    const response = await axios.get<FimsUserInfo>(`${fimsBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.info("FIMS user info retrieved successfully");
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(`Error retrieving user info from FIMS: ${err.response.data}`);
    }
    throw err;
  }
};
