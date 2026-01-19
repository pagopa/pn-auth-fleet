// Mock the environment variables
export function setupEnv() {
  process.env = {
    KEY_ALIAS: "SessionKey",
    CACHE_TTL: "3600",
    TOKEN_TTL: "7200",
    ISSUER: "https://webapi.dev.notifichedigitali.it",
    ALLOWED_ISSUER: "https://uat.oneid.pagopa.it",
    ALLOWED_ORIGIN: "https://cittadini.dev.notifichedigitali.it",
    ALLOWED_TAXIDS_PARAMETER: "fake-path/fake-param",
    AUDIENCE: "webapi.dev.pn.pagopa.it",
    _X_AMZN_TRACE_ID: "my_trace_id",
    ONE_IDENTITY_SECRET_NAME: "one-identity-secret-name",
    ONE_IDENTITY_BASEURL: "https://uat.oneid.pagopa.it",
    AWS_SESSION_TOKEN: "fake-session-token",
    PN_EMD_INTEGRATION_BASEURL: "http://${ApplicationLoadBalancerDomain}:8080",
  };
}
