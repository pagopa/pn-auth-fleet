const { apiGatewayUtils } = require("pn-auth-common");
const policies = require("../policies");

const API_LOGOUT = "logout";

// the logout api has its own gateway: on that gateway the logout policy is returned instead of the given one
const getPolicyWithLogout = async (event, contextAttrs, buildPolicy) => {
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
      return policies.buildLogoutPolicy({
        region,
        awsAccountId,
        restApiId,
        stage,
        contextAttrs,
      });
    }
  }

  return buildPolicy({
    region,
    awsAccountId,
    restApiId,
    stage,
    contextAttrs,
  });
};

const getSupportPolicy = (event, contextAttrs) =>
  getPolicyWithLogout(event, contextAttrs, (params) => policies.buildSupportPolicy(params));

const getPtPolicy = (event, contextAttrs) =>
  getPolicyWithLogout(event, contextAttrs, (params) => policies.buildPtPolicy(params));

module.exports = {
  getSupportPolicy,
  getPtPolicy,
};
