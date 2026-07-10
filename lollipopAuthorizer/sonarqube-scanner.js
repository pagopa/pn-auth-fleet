const options = {
  "sonar.organization": "pagopa",
  "sonar.projectKey": "pagopa_pn-auth-fleet_lollipopAuthorizer",
};

if (process.env.PR_NUM) {
  options["sonar.pullrequest.base"] = process.env.BRANCH_TARGET;
  options["sonar.pullrequest.branch"] = process.env.BRANCH_NAME;
  options["sonar.pullrequest.key"] = process.env.PR_NUM;
}

import sonarqubeScanner from "sonarqube-scanner";

const scanner = sonarqubeScanner.default;

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
