const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

module.exports = {
    async getKeyTags(apiKeyId) {
        const apigateway = new AWS.APIGateway();
        const awsRegion = process.env.AWS_REGION;
        const apiKeyArn = 'arn:aws:apigateway:' + awsRegion + '::/apikeys/' + apiKeyId;
        console.log('Getting Tags for ', apiKeyArn);
        
        const params = {
            resourceArn: apiKeyArn /* required */
        };
        const request = apigateway.getTags(params);
        return request.promise();
    }
}
