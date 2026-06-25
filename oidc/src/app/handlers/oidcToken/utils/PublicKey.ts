import { getJwksPublicKey } from "pn-auth-common-ts";
import { retrieveEnvVariable } from "../../../config";

export async function getPublicKey(issuer: string, kid: string) {
  const jwksUrl = `${retrieveEnvVariable("ONE_IDENTITY_BASEURL")}/oidc/keys`;
  return getJwksPublicKey(jwksUrl, issuer, kid);
}
