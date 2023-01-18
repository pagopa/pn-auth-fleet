import { APIGatewayClient, GetTagsCommand } from "@aws-sdk/client-api-gateway";

export const getOpenAPIS3Location = async (apiOptions) => {
    const apigwClient = new APIGatewayClient();
    const input = {
        resourceArn: `arn:aws:apigateway:${apiOptions.region}::/restapis/${apiOptions.restApiId}`
    };
    const command = new GetTagsCommand(input);
    const response = apigwClient.send(command)
        .then((data) => {
            // $metadata is also returned, we need to select tags
            const bucketName = data.tags.PN_OPENAPI_BUCKET_NAME;
            const bucketKey = data.tags.PN_OPENAPI_BUCKET_KEY;
            if (bucketName === undefined || bucketKey === undefined) {
                throw 'OpenAPI file location is not defined';
            } else {
                return [bucketName, bucketKey];
            }
        });
    return response;
};