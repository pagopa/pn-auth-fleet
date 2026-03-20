const { apiGatewayUtils, s3Utils } = require("pn-auth-common");

const WHITELISTED_API_NAMES = new Set(["logout"]);

const hasSupportPermission = async (event, role) => {
  const tmp = event.methodArn.split(":");
  const region = tmp[3];
  const restApiId = tmp[5].split("/")[0];

  const { bucketName, bucketKey, servicePath, apiName } = await apiGatewayUtils.getApiGatewayTags({
    region,
    restApiId,
  });

  if (WHITELISTED_API_NAMES.has(apiName)) {
    return;
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
  if (resources.length === 0) {
    throw new Error(`No permitted resources for role: "${role}", servicePath: "${servicePath}"`);
  }
};

module.exports = {
  hasSupportPermission,
};
