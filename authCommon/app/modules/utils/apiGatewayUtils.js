const { APIGatewayClient, GetTagsCommand } = require("@aws-sdk/client-api-gateway");

/**
 * Retrieves the PN tags from the specified API Gateway REST API.
 *
 * @param {Object} params - The API Gateway identifiers.
 * @param {string} params.region - The AWS region of the REST API.
 * @param {string} params.restApiId - The REST API ID.
 * @returns {Promise<{bucketName: string | undefined, bucketKey: string | undefined, servicePath: string | undefined, apiName: string | undefined}>}
 */
async function getApiGatewayTags({ region, restApiId }) {
  const apigwClient = new APIGatewayClient({ region });
  const input = {
    resourceArn: `arn:aws:apigateway:${region}::/restapis/${restApiId}`,
  };
  const command = new GetTagsCommand(input);
  const data = await apigwClient.send(command);

  return {
    bucketName: data.tags?.PN_OPENAPI_BUCKET_NAME,
    bucketKey: data.tags?.PN_OPENAPI_BUCKET_KEY,
    servicePath: data.tags?.PN_SERVICE_PATH,
    apiName: data.tags?.ApiName,
  };
}

module.exports = { getApiGatewayTags };
