import { signKmsJwt, SessionTokenPayload, SourceChannel } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";

interface GenerateSessionPayloadProps {
  uid: string;
  state: string;
}

// The FIMS flow is always a WEB-channel login originated by app IO.
const FIMS_SOURCE = { channel: SourceChannel.WEB, details: "FIMS" };

/**
 * Build the long-lived session token payload, same shape and env config as the
 * oidc session token (ISSUER / AUDIENCE / TOKEN_TTL). `source` is embedded so it
 * ends up inside the signed JWT, like oidc.
 *
 * @param uid - internal cx id
 * @param state - OIDC state, carried through as `jti`
 */
export const generateSessionPayload = ({
  uid,
  state,
}: GenerateSessionPayloadProps): SessionTokenPayload => {
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
    source: FIMS_SOURCE,
  };
};

/**
 * Sign the long-lived session token with the KMS key identified by KEY_ALIAS.
 */
export const generateSessionToken = async (payload: SessionTokenPayload): Promise<string> => {
  const keyAlias = retrieveEnvVariable("KEY_ALIAS");
  return signKmsJwt({ payload: { ...payload }, keyAlias });
};
