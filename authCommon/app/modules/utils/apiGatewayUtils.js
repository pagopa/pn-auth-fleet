const {
  APIGatewayClient,
  GetTagsCommand,
} = require("@aws-sdk/client-api-gateway");

const apigwClient = new APIGatewayClient();

/**
 * Retrieves the S3 location of the OpenAPI document from the API Gateway resource tags.
 *
 * Reads the tags `PN_OPENAPI_BUCKET_NAME`, `PN_OPENAPI_BUCKET_KEY`, and `PN_SERVICE_PATH`
 * from the specified REST API in API Gateway and returns them as the S3 coordinates
 * of the OpenAPI YAML document.
 *
 * @param {Object} apiOptions - The API Gateway identifiers.
 * @param {string} apiOptions.region - The AWS region of the REST API.
 * @param {string} apiOptions.restApiId - The REST API ID.
 * @returns {Promise<[string, string, string]>} A tuple of `[bucketName, bucketKey, servicePath]`.
 * @throws {Error} If `PN_OPENAPI_BUCKET_NAME` or `PN_OPENAPI_BUCKET_KEY` tags are not defined.
 */
async function getOpenAPIS3Location(apiOptions) {
  const input = {
    resourceArn: `arn:aws:apigateway:${apiOptions.region}::/restapis/${apiOptions.restApiId}`,
  };
  const command = new GetTagsCommand(input);
  const response = apigwClient.send(command).then((data) => {
    // $metadata is also returned, we need to select tags
    const bucketName = data.tags.PN_OPENAPI_BUCKET_NAME;
    const bucketKey = data.tags.PN_OPENAPI_BUCKET_KEY;
    const servicePath = data.tags.PN_SERVICE_PATH;
    if (bucketName === undefined || bucketKey === undefined) {
      throw new Error("OpenAPI file location is not defined");
    } else {
      return [bucketName, bucketKey, servicePath];
    }
  });
  return response;
}

module.exports = { getOpenAPIS3Location };
