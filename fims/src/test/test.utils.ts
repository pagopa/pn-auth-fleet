import { EnvVariableName } from "../app/config";

// Mock the environment variables
export function setupEnv() {
  process.env = {
    PN_DATA_VAULT_BASEURL: "http://alb.confidential.pn.internal:8080",
    FIMS_BASEURL: "https://oauth.io.pagopa.it",
    FIMS_ISSUER_URL: "https://oauth.io.pagopa.it",
    FIMS_REDIRECT_URI: "https://webapi.dev.notifichedigitali.it/fims/token",
    FIMS_FRONTEND_BASEURL: "https://cittadini.dev.notifichedigitali.it",
    FIMS_SECRET_NAME: "pn-auth-fleet/fims-credentials",
    ASSERTION_EXPIRE_IN_DAYS: "365",
    IDP_CONFIG_BASE_URI: "https://api.is.eng.pagopa.it",
    IDP_CLIENT_CIEIDD:
      "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO",
    IDP_HTTP_TIMEOUT_MS: "10000",
    FIMS_REDIS_STATE_TTL: "60",
    CACHE_TTL: "300",
    KEY_ALIAS: "SessionKey",
    FIMS_TOKEN_TTL: "60",
    ISSUER: "https://webapi.dev.notifichedigitali.it",
    AUDIENCE: "webapi.dev.pn.pagopa.it",
    TOKEN_TTL: "7200",
    ALLOWED_ORIGIN: "https://cittadini.dev.notifichedigitali.it",
  } satisfies Record<EnvVariableName, string>;
}
