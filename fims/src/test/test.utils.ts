import { EnvVariableName } from "../app/config";

// Mock the environment variables
export function setupEnv() {
  process.env = {
    REDIS_ENDPOINT: "fake-redis-endpoint",
    REDIS_SERVER_NAME: "fake-redis-server",
    USER_ID_REDIS: "fake-redis-user",
    PN_DATA_VAULT_BASEURL: "http://alb.confidential.pn.internal:8080",
    DATA_VAULT_HTTP_TIMEOUT_MS: "2000",
    KEY_ALIAS: "SessionKey",
    ISSUER: "https://webapi.dev.notifichedigitali.it",
    AUDIENCE: "webapi.dev.pn.pagopa.it",
    TOKEN_TTL: "7200",
    FIMS_BASEURL: "https://oauth.io.pagopa.it",
    FIMS_REDIRECT_URI: "https://webapi.dev.notifichedigitali.it/fims-token",
    FIMS_SECRET_NAME: "pn-auth-fleet/fims-credentials",
    FIMS_REDIS_STATE_TTL: "300",
    AWS_SESSION_TOKEN: "fake-session-token",
    _X_AMZN_TRACE_ID: "my_trace_id",
  } satisfies Record<EnvVariableName, string>;
}
