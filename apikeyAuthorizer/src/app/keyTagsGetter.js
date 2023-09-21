import { GetTagsCommand } from "@aws-sdk/client-api-gateway";
import apiGatewayClient from "./apiGatewayClient.js";

async function getKeyTags(apiKeyId) {
  const awsRegion = await apiGatewayClient.config.region();
  const apiKeyArn =
    "arn:aws:apigateway:" + awsRegion + "::/apikeys/" + apiKeyId;
  console.log("Getting Tags for ", apiKeyArn);

  const params = {
    resourceArn: apiKeyArn /* required */,
  };

  const command = new GetTagsCommand(params);
  try {
    // process data.
    const request = await apiGatewayClient.send(command);
    return request;
  } catch (error) {
    // error handling.
    throw error;
  }
}

export { getKeyTags };
