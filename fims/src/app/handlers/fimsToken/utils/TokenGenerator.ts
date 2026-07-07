import { signKmsJwt } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";
import { FimsJwtPayload } from "../models/Token";

interface GenerateFimsJwtPayloadProps {
  uid: string;
  fiscalCode: string;
  givenName: string;
  familyName: string;
  state: string;
}

/**
 * Build the session token payload from the FIMS UserInfo claims and the internal
 * cx id resolved from pn-data-vault. Short-lived: `exp` is driven by
 * FIMS_TOKEN_TTL (single-use handoff to the frontend).
 *
 * @param uid - Internal cx id (from pn-data-vault)
 * @param fiscalCode - Citizen fiscal code
 * @param givenName - Citizen given name
 * @param familyName - Citizen family name
 * @param state - The OIDC state
 */
export const generateFimsJwtPayload = ({
  uid,
  fiscalCode,
  givenName,
  familyName,
  state,
}: GenerateFimsJwtPayloadProps): FimsJwtPayload => {
  const ttl = Number(retrieveEnvVariable("FIMS_TOKEN_TTL"));
  const iat = Math.floor(Date.now() / 1000);

  return {
    uid,
    fiscal_code: fiscalCode,
    given_name: givenName,
    family_name: familyName,
    state,
    iat,
    exp: iat + ttl,
  };
};

/**
 * Sign the session token with the KMS key identified by KEY_ALIAS.
 *
 * @param payload - The session token payload
 */
export const generateSessionToken = async (payload: FimsJwtPayload): Promise<string> => {
  const keyAlias = retrieveEnvVariable("KEY_ALIAS");
  return signKmsJwt({ payload: { ...payload }, keyAlias });
};
