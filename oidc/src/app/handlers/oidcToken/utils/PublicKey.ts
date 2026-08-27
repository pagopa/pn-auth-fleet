import { getJwksPublicKey } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";

export async function getPublicKey(issuer: string, kid: string) {
  const jwksUrl = `${retrieveEnvVariable("ONE_IDENTITY_BASEURL")}/oidc/keys`;
  const cacheTTL = Number(retrieveEnvVariable("CACHE_TTL", "300"));
  return getJwksPublicKey({ jwksUrl, issuer, kid, cacheTTL });
}
