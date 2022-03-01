
const scanner = require("sonarqube-scanner");
scanner(
  {
    serverUrl: "https://sonarcloud.io",
    options: {
      "sonar.organization": "pagopa",
      "sonar.projectKey": "pagopa_pn-auth-fleet_apikeyAuthorizer",
    },
  },
  () => process.exit()
);