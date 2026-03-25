const { apiGatewayUtils, AuthPolicy } = require("pn-auth-common");

const API_LOGOUT = "logout";

const getSupportPolicy = async (event, contextAttrs) => {
  const tmp = event.methodArn.split(":");
  const awsAccountId = tmp[4];
  const apiGatewayArnTmp = tmp[5].split("/");
  const restApiId = apiGatewayArnTmp[0];
  const stage = apiGatewayArnTmp[1];
  const region = tmp[3];

  const apiOptions = { region, restApiId, stage };
  const policy = new AuthPolicy("user", awsAccountId, apiOptions);

  const { apiName } = await apiGatewayUtils.getApiGatewayTags({
    region,
    restApiId,
  });

  if (apiName === API_LOGOUT) {
    policy.allowAllMethods();
    return policy.build(contextAttrs);
  }

  policy.allowMethod("GET", "*");

  return policy.build(contextAttrs);
};

module.exports = {
  getSupportPolicy,
};
