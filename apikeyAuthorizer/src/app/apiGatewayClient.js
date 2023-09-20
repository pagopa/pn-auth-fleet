// Create a service client module using ES6 syntax.
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import AWSXRay from "aws-xray-sdk"; /* refers to: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html */

// Create the API Gateway client.
const apiGatewayClient = AWSXRay.captureAWSv3Client(
  new APIGatewayClient({ region: process.env.AWS_REGION ?? "eu-central-1" })
);

export default apiGatewayClient;
