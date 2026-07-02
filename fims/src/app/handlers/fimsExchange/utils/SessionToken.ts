import { signKmsJwt } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";
import { FimsSessionTokenPayload } from "../models/Exchange";

interface GenerateSessionPayloadProps {
  uid: string;
  state: string;
}

/**
 * Build the long-lived session token payload, same shape and env config as the
 * oidc session token (ISSUER / AUDIENCE / TOKEN_TTL).
 *
 * @param uid - internal cx id
 * @param state - OIDC state, carried through as `jti`
 */
export const generateSessionPayload = ({
  uid,
  state,
}: GenerateSessionPayloadProps): FimsSessionTokenPayload => {
  const issuer = retrieveEnvVariable("ISSUER");
  const audience = retrieveEnvVariable("AUDIENCE");
  const ttl = Number(retrieveEnvVariable("TOKEN_TTL"));
  const iat = Math.floor(Date.now() / 1000);

  return {
    iat,
    exp: iat + ttl,
    uid,
    iss: issuer,
    aud: audience,
    jti: state,
  };
};

/**
 * Sign the long-lived session token with the KMS key identified by KEY_ALIAS.
 */
export const generateSessionToken = async (payload: FimsSessionTokenPayload): Promise<string> => {
  const keyAlias = retrieveEnvVariable("KEY_ALIAS");
  return signKmsJwt({ payload: { ...payload }, keyAlias });
};
