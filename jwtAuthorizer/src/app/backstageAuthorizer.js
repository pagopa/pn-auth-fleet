const { apiGatewayUtils, s3Utils, AuthPolicy } = require("pn-auth-common");

const API_LOGOUT = "logout";

const getSupportPolicy = async (event, role, contextAttrs) => {
  const tmp = event.methodArn.split(":");
  const awsAccountId = tmp[4];
  const apiGatewayArnTmp = tmp[5].split("/");
  const restApiId = apiGatewayArnTmp[0];
  const stage = apiGatewayArnTmp[1];
  const region = tmp[3];

  const apiOptions = { region, restApiId, stage };
  const policy = new AuthPolicy("user", awsAccountId, apiOptions);

  const { bucketName, bucketKey, servicePath, apiName } = await apiGatewayUtils.getApiGatewayTags({
    region,
    restApiId,
  });

  if (apiName === API_LOGOUT) {
    policy.allowAllMethods();
    return policy.build(contextAttrs);
  }

  event.servicePath = servicePath;

  if (bucketName === undefined || bucketKey === undefined) {
    throw new Error("OpenAPI file location is not defined");
  }

  const resources = await s3Utils.getAllowedResourcesFromS3({
    event,
    bucketName,
    bucketKey,
    userTags: [role],
    tagName: "x-support-roles-permissions",
    requireTags: true,
  });

  for (const r of resources) {
    policy.allowMethod(r.method, r.path);
  }

  return policy.build(contextAttrs);
};

module.exports = {
  getSupportPolicy,
};
