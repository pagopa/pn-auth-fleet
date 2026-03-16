const { apiGatewayUtils, s3Utils } = require("pn-auth-common");

const hasSupportPermission = async (event, role) => {
  const tmp = event.methodArn.split(":");
  const region = tmp[3];
  const restApiId = tmp[5].split("/")[0];

  const [bucketName, bucketKey, servicePath] = await apiGatewayUtils.getOpenAPIS3Location({ region, restApiId });
  event.servicePath = servicePath;

  const resources = await s3Utils.getAllowedResourcesFromS3(
    event,
    bucketName,
    bucketKey,
    [role],
    "x-support-roles-permissions",
    true,
  );
  if (resources.length === 0) {
    throw new Error("No resource permitted");
  }
};

module.exports = {
  hasSupportPermission,
};
