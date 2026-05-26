process.env.NODE_ENV = "test";
process.env.KEY_ALIAS = "SessionKey";
process.env.CACHE_TTL = "3600";
process.env.TOKEN_TTL = "7200";
process.env.ISSUER = "pn-develop.pn.pagopa.it";
process.env.ALLOWED_ISSUER = "https://spid-hub-test.dev.pn.pagopa.it,api.selfcare.pagopa.it";
process.env.ALLOWED_ORIGIN = "https://portale-pa-develop.fe.dev.pn.pagopa.it,https://portale-pf-develop.fe.dev.pn.pagopa.it";
process.env.ALLOWED_TAXIDS_PARAMETER = "fake-path/fake-param";
process.env.ACCEPTED_AUDIENCE = "portale-pa-develop.fe.dev.pn.pagopa.it,portale-pf-develop.fe.dev.pn.pagopa.it";
process.env.AUDIENCE = "webapi.dev.pn.pagopa.it";
process.env._X_AMZN_TRACE_ID = "my_trace_id";
process.env.PN_EMD_INTEGRATION_BASEURL = "http://${ApplicationLoadBalancerDomain}:8080";

console.log = () => {};
console.info = () => {};
console.debug = () => {};
console.warn = () => {};
console.error = () => {};
