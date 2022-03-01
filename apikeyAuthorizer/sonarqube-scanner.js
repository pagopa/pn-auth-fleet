
const scanner = require("sonarqube-scanner");
scanner(
  {
    serverUrl: "https://sonarcloud.io",
    options: {
      "sonar.organization": "pagopa",
      "sonar.projectKey": "pagopa_pn-auth-fleet_apikeyAuthorizer",
      "sonar.pullrequest.base": process.env.BRANCH_TARGET,
      "sonar.pullrequest.branch": process.env.BRANCH_NAME,
      "sonar.pullrequest.key": process.env.PR_NUM
    },
  },
  () => process.exit()
);