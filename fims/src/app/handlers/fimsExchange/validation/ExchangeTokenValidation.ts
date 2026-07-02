import { ValidationException, verifyKmsJwt } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";
import { FimsJwtPayload } from "../../fimsToken/models/Token";

/**
 * Validate the incoming fimsToken the same way jwtAuthorizer validates PN's
 * self-issued tokens: resolve the signing key from the JWT `kid` via KMS and
 * verify signature + expiry. The token is self-signed by our KMS key, so no
 * issuer/audience check is needed. Returns the decoded FIMS claims.
 *
 * @param fimsToken - the short-lived token issued by /token
 */
export async function validateFimsToken(fimsToken: string): Promise<FimsJwtPayload> {
  const cacheTTL = Number(retrieveEnvVariable("CACHE_TTL"));

  const payload = await verifyKmsJwt<FimsJwtPayload>({
    jwt: fimsToken,
    cacheTTL,
  });

  const { uid, fiscal_code, given_name, family_name, state } = payload;
  if (!uid || !fiscal_code || !state || !given_name || !family_name) {
    throw new ValidationException("fimsToken is missing required claims");
  }

  return payload;
}
