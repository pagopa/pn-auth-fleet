export type EnvVariableName =
  | "ONE_IDENTITY_SECRET_NAME"
  | "ONE_IDENTITY_BASEURL"
  | "ONE_IDENTITY_REDIRECT_URI"
  | "ONE_IDENTITY_REDIS_STATE_TTL"
  | "KEY_ALIAS"
  | "ISSUER"
  | "AUDIENCE"
  | "TOKEN_TTL"
  | "AWS_SESSION_TOKEN"
  | "PN_EMD_INTEGRATION_BASEURL"
  | "ALLOWED_ISSUER"
  | "ALLOWED_ORIGIN"
  | "ALLOWED_TAXIDS_PARAMETER"
  | "CACHE_TTL"
  | "_X_AMZN_TRACE_ID";

import { retrieveEnvVariable as retrieve } from "pn-auth-common-ts";

// Thin typed wrapper around the shared helper, keeping the OIDC env var union
// for call-site type-safety.
export function retrieveEnvVariable(name: EnvVariableName, defaultValue?: string): string {
  return retrieve(name, defaultValue);
}
