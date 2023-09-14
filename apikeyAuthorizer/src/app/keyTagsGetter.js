const { APIGatewayClient } = require("./apiGatewayClient.js");
const { GetTagsCommand } = require("@aws-sdk/client-api-gateway");

module.exports = {
  async getKeyTags(apiKeyId) {
    const awsRegion = await APIGatewayClient.config.region();
    const apiKeyArn =
      "arn:aws:apigateway:" + awsRegion + "::/apikeys/" + apiKeyId;
    console.log("Getting Tags for ", apiKeyArn);

    const params = {
      resourceArn: apiKeyArn /* required */,
    };

    const command = new GetTagsCommand(params);
    try {
      // process data.
      const request = await APIGatewayClient.send(command);
      return request;
    } catch (error) {
      // error handling.
      throw error;
    }
  },
};
