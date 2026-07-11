const options = {
  "sonar.organization": "pagopa",
  "sonar.projectKey": "pagopa_pn-auth-fleet_jwtIssuersManager",
};

if (process.env.PR_NUM) {
  options["sonar.pullrequest.base"] = process.env.BRANCH_TARGET;
  options["sonar.pullrequest.branch"] = process.env.BRANCH_NAME;
  options["sonar.pullrequest.key"] = process.env.PR_NUM;
}

const scanner = require("sonarqube-scanner").default;

scanner(
  {
    serverUrl: "https://sonarcloud.io",
    options: options,
  },
  (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit();
  }
);
