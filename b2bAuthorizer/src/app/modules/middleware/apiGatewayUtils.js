const {
  APIGatewayClient,
  GetTagsCommand,
} = require("@aws-sdk/client-api-gateway");

const apigwClient = new APIGatewayClient();

async function getOpenAPIS3Location(apiOptions) {
  const input = {
    resourceArn: `arn:aws:apigateway:${apiOptions.region}::/restapis/${apiOptions.restApiId}`,
  };
  const command = new GetTagsCommand(input);
  //TODO Dubbio, chi inserisce i tag, dove? Viene popolato automaticamente da infra giusto?
  console.log('start send(command)');
  try {
    const response = await apigwClient.send(command);
    console.log('response getOpenAPIS3Location', response);
    const bucketName = response.tags.PN_OPENAPI_BUCKET_NAME;
    const bucketKey = response.tags.PN_OPENAPI_BUCKET_KEY;
    const servicePath = response.tags.PN_SERVICE_PATH;
    if (bucketName === undefined || bucketKey === undefined) {
      throw new Error("OpenAPI file location is not defined");
    } else {
      return [bucketName, bucketKey, servicePath];
    }
  } catch (error) {
    console.log('error getOpenAPIS3Location', error);
  }

  return undefined;
}

module.exports = { getOpenAPIS3Location };
