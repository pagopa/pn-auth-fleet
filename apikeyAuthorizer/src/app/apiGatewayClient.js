// Create a service client module using ES6 syntax.
const { APIGatewayClient } = require("@aws-sdk/client-api-gateway");
const AWSXRay = require("aws-xray-sdk"); /* refers to: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html */

const apiGatewayClient = AWSXRay.captureAWSv3Client(
  new APIGatewayClient({ region: process.env.AWS_REGION ?? "eu-central-1" })
);

// Create the DynamoDB document client.
module.exports.APIGatewayClient = apiGatewayClient;
