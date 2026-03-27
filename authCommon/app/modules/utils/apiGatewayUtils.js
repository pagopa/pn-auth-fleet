const { APIGatewayClient, GetTagsCommand } = require("@aws-sdk/client-api-gateway");

const apigwClient = new APIGatewayClient();

/**
 * Retrieves the PN tags from the specified API Gateway REST API.
 *
 * @param {Object} params - The API Gateway identifiers.
 * @param {string} params.region - The AWS region of the REST API.
 * @param {string} params.restApiId - The REST API ID.
 * @returns {Promise<{bucket: string, key: string, servicePath: string, apiName: string}>}
 */
async function getApiGatewayTags({ region, restApiId }) {
  const input = {
    resourceArn: `arn:aws:apigateway:${region}::/restapis/${restApiId}`,
  };
  const command = new GetTagsCommand(input);
  const data = await apigwClient.send(command);
  console.log("API Gateway tags:", data.tags);
  return {
    bucketName: data.tags.PN_OPENAPI_BUCKET_NAME,
    bucketKey: data.tags.PN_OPENAPI_BUCKET_KEY,
    servicePath: data.tags.PN_SERVICE_PATH,
    apiName: data.tags.ApiName,
  };
}

module.exports = { getApiGatewayTags };
