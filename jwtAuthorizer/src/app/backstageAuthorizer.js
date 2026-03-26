const { apiGatewayUtils } = require("pn-auth-common");
const { buildAllowAllPolicy, buildSupportPolicy } = require("../policies");

const API_LOGOUT = "logout";

const getSupportPolicy = async (event, contextAttrs) => {
  const tmp = event.methodArn.split(":");
  const region = tmp[3];
  const awsAccountId = tmp[4];
  const apiGatewayArnTmp = tmp[5].split("/");
  const restApiId = apiGatewayArnTmp[0];
  const stage = apiGatewayArnTmp[1];
  const method = apiGatewayArnTmp[2];

  if (method === "POST") {
    const { apiName } = await apiGatewayUtils.getApiGatewayTags({
      region,
      restApiId,
    });

    if (apiName === API_LOGOUT) {
      return buildAllowAllPolicy({
        region,
        awsAccountId,
        restApiId,
        stage,
        contextAttrs,
      });
    }
  }

  return buildSupportPolicy({
    region,
    awsAccountId,
    restApiId,
    stage,
    contextAttrs,
  });
};

module.exports = {
  getSupportPolicy,
};
