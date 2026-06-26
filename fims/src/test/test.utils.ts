import { EnvVariableName } from "../app/config";

// Mock the environment variables
export function setupEnv() {
  process.env = {
    PN_DATA_VAULT_BASEURL: "http://alb.confidential.pn.internal:8080",
    FIMS_BASEURL: "https://oauth.io.pagopa.it",
    FIMS_REDIRECT_URI: "https://webapi.dev.notifichedigitali.it/fims/token",
    FIMS_SECRET_NAME: "pn-auth-fleet/fims-credentials",
    FIMS_REDIS_STATE_TTL: "300",
  } satisfies Record<EnvVariableName, string>;
}
