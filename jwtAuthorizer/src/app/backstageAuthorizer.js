const { apiGatewayUtils, s3Utils } = require("pn-auth-common");

const WHITELISTED_API_NAMES = new Set(["logout"]);

const hasSupportPermission = async (event, role) => {
  if (WHITELISTED_API_NAMES.has(event.stageVariables?.apiName)) {
    return;
  }
  const tmp = event.methodArn.split(":");
  const region = tmp[3];
  const restApiId = tmp[5].split("/")[0];

  const [bucket, key, servicePath] = await apiGatewayUtils.getOpenAPIS3Location({ region, restApiId });
  event.servicePath = servicePath;

  const resources = await s3Utils.getAllowedResourcesFromS3({
    event,
    bucket,
    key,
    userTags: [role],
    tagName: "x-support-roles-permissions",
    requireTags: true,
  });
  if (resources.length === 0) {
    throw new Error(`No permitted resources for role: ${role}, servicePath: ${servicePath}`);
  }
};

module.exports = {
  hasSupportPermission,
};
