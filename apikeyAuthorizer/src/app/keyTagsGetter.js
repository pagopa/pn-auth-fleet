const AWS = require('aws-sdk');

module.exports = {
    async getKeyTags(apiKeyId) {
        const apigateway = new AWS.APIGateway();
        const awsRegion = process.env.AWS_REGION;
        const apiKeyArn = 'arn:aws:apigateway:' + awsRegion + '::/apikeys/' + apiKeyId;
        console.log('Getting Tags for ', apiKeyArn);
        
        var params = {
            resourceArn: apiKeyArn /* required */
        };
        var request = apigateway.getTags(params);
        return request.promise();
    }
}
