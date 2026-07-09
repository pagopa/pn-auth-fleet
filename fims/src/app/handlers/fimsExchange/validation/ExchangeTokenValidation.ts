import { KmsJwtVerifier } from "pn-auth-common";
import { ValidationException } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";
import { FimsJwtPayload } from "../../fimsToken/models/Token";

/**
 * Validate the incoming fimsToken the same way jwtAuthorizer validates PN's
 * self-issued tokens: resolve the signing key from the JWT `kid` via KMS and
 * verify signature + expiry (shared KmsJwtVerifier). We additionally check that
 * `iss` matches our own issuer, since we minted the token in /token. Returns the
 * decoded claims.
 *
 * @param fimsToken - the short-lived token issued by /token
 */
export async function validateFimsToken(fimsToken: string): Promise<FimsJwtPayload> {
  const cacheTTL = Number(retrieveEnvVariable("CACHE_TTL"));

  let payload: FimsJwtPayload;
  try {
    payload = await KmsJwtVerifier.validation<FimsJwtPayload>({ jwtToken: fimsToken, cacheTTL });
  } catch (err) {
    // Normalize the shared verifier error to a ValidationException (-> HTTP 400).
    throw new ValidationException((err as Error).message);
  }

  const { uid, fiscal_code, given_name, family_name, state, iss } = payload;
  if (!uid || !fiscal_code || !state || !given_name || !family_name) {
    throw new ValidationException("fimsToken is missing required claims");
  }

  if (iss !== retrieveEnvVariable("ISSUER")) {
    throw new ValidationException("Invalid issuer");
  }

  return payload;
}
