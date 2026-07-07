export type EnvVariableName =
  | "PN_DATA_VAULT_BASEURL"
  | "FIMS_BASEURL"
  | "FIMS_ISSUER_URL"
  | "FIMS_REDIRECT_URI"
  | "FIMS_FRONTEND_BASEURL"
  | "FIMS_SECRET_NAME"
  | "FIMS_REDIS_STATE_TTL"
  | "CACHE_TTL"
  | "IDP_CONFIG_BASE_URI"
  | "IDP_CLIENT_CIEIDD"
  | "IDP_HTTP_TIMEOUT_MS"
  | "ASSERTION_EXPIRE_IN_DAYS"
  | "KEY_ALIAS"
  | "FIMS_TOKEN_TTL"
  | "ISSUER"
  | "AUDIENCE"
  | "TOKEN_TTL"
  | "ALLOWED_ORIGIN";

import { retrieveEnvVariable as retrieve } from "pn-auth-common-ts";

// Thin typed wrapper around the shared helper, keeping the FIMS env var union
// for call-site type-safety.
export function retrieveEnvVariable(name: EnvVariableName, defaultValue?: string): string {
  return retrieve(name, defaultValue);
}
