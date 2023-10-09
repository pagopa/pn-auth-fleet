import { GetTagsCommand, APIGatewayClient } from "@aws-sdk/client-api-gateway";
import AWSXRay from "aws-xray-sdk"; /* refers to: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html */

async function getKeyTags(apiKeyId) {
  const apigateway = AWSXRay.captureAWSv3Client(new APIGatewayClient());
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

export { getKeyTags };
