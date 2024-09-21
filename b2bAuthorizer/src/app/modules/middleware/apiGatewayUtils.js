const {
  APIGatewayClient,
  GetTagsCommand,
} = require("@aws-sdk/client-api-gateway");

const apigwClient = new APIGatewayClient();

async function getOpenAPIS3Location(apiOptions) {
  console.log('start getOpenAPIS3Location');
  const input = {
    resourceArn: `arn:aws:apigateway:${apiOptions.region}::/restapis/${apiOptions.restApiId}`,
  };
  console.log('input:  ',input);
  const command = new GetTagsCommand(input);
  //TODO Dubbio, chi inserisce i tag, dove? Viene popolato automaticamente da infra giusto?
  const response = apigwClient.send(command).then((data) => {
    // $metadata is also returned, we need to select tags
    console.log('PN_OPENAPI_BUCKET_NAME:  ',data.tags.PN_OPENAPI_BUCKET_NAME);
    console.log('PN_OPENAPI_BUCKET_KEY:  ',data.tags.PN_OPENAPI_BUCKET_KEY);
    console.log('PN_SERVICE_PATH:  ',data.tags.PN_SERVICE_PATH);
    console.log('start apigwClient.send');

    const bucketName = data.tags.PN_OPENAPI_BUCKET_NAME;
    const bucketKey = data.tags.PN_OPENAPI_BUCKET_KEY;
    const servicePath = data.tags.PN_SERVICE_PATH;
    if (bucketName === undefined || bucketKey === undefined) {
      throw new Error("OpenAPI file location is not defined");
    } else {
      return [bucketName, bucketKey, servicePath];
    }
  });
  console.log('end getOpenAPIS3Location');
  return response;
}

module.exports = { getOpenAPIS3Location };
