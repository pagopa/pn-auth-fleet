import { getJwksPublicKey } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";

export async function getPublicKey(issuer: string, kid: string) {
  const jwksUrl = `${retrieveEnvVariable("FIMS_ISSUER_URL")}/jwks`;
  return getJwksPublicKey(jwksUrl, issuer, kid);
}