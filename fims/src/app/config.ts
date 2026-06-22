export type EnvVariableName =
  | "REDIS_ENDPOINT"
  | "REDIS_SERVER_NAME"
  | "USER_ID_REDIS"
  | "PN_DATA_VAULT_BASEURL"
  | "DATA_VAULT_HTTP_TIMEOUT_MS"
  | "KEY_ALIAS"
  | "ISSUER"
  | "AUDIENCE"
  | "TOKEN_TTL"
  | "FIMS_BASEURL"
  | "FIMS_REDIRECT_URI"
  | "FIMS_SECRET_NAME"
  | "FIMS_REDIS_STATE_TTL"
  | "AWS_SESSION_TOKEN"
  | "_X_AMZN_TRACE_ID";

import { retrieveEnvVariable as retrieve } from "pn-auth-common-ts";

// Thin typed wrapper around the shared helper, keeping the FIMS env var union
// for call-site type-safety.
export function retrieveEnvVariable(name: EnvVariableName, defaultValue?: string): string {
  return retrieve(name, defaultValue);
}
