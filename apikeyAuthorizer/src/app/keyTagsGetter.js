const {
  GetTagsCommand,
  APIGatewayClient,
} = require("@aws-sdk/client-api-gateway");
const AWSXRay = require("aws-xray-sdk"); /* refers to: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html */

const apigateway = AWSXRay.captureAWSv3Client(new APIGatewayClient());

async function getKeyTags(apiKeyId) {
  const awsRegion = process.env.AWS_REGION;
  const apiKeyArn =
    "arn:aws:apigateway:" + awsRegion + "::/apikeys/" + apiKeyId;
  console.log("Getting Tags for ", apiKeyArn);

  const params = {
    resourceArn: apiKeyArn /* required */,
  };

  const command = new GetTagsCommand(params);
  const request = await apigateway.send(command);
  return request;
}

module.exports = { getKeyTags };
