
const scanner = require("sonarqube-scanner");
let options = {
    "sonar.organization": "pagopa",
    "sonar.projectKey": "pagopa_pn-auth-fleet_jwtAuthorizer"
}

if (process.env.PR_NUM != null) {
    options["sonar.pullrequest.base"] = process.env.BRANCH_TARGET;
    options["sonar.pullrequest.branch"] = process.env.BRANCH_NAME;
    options["sonar.pullrequest.key"] = process.env.PR_NUM;
}
scanner(
  {
    serverUrl: "https://sonarcloud.io",
    options: options
    },
  },
  () => process.exit()
);