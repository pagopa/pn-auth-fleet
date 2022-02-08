const AWS = require('aws-sdk');
const iamPolicyGenerator = require('./iamPolicyGen.js')
const PAID_TAG = 'pa_id'

const defaultDenyAllPolicy = {
    "principalId": "user",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "execute-api:Invoke",
                "Effect": "Deny",
                "Resource": "*"
            }
        ]
    }
};

module.exports = {
    async handleEvent(event){
        // Declare Policy
        let iamPolicy = null;
        
        // Capture apiKey from event
        const apiKeyId = event.requestContext.identity.apiKeyId;
        console.log('ApiKeyId', apiKeyId);
        await getKeyTags(apiKeyId).then(data => {
            console.log('data', data);
            // Retrieve token scopes
            const paId = data.tags[PAID_TAG];
            console.log('ApiKey paId Tags', paId);
            // Generate IAM Policy
            iamPolicy = await iamPolicyGenerator.generateIAMPolicy(event.methodArn, paId);
        })
        .catch(err => {
            console.log(err);
            iamPolicy = defaultDenyAllPolicy;
        });
        console.log('IAM Policy', JSON.stringify(iamPolicy));
        return iamPolicy;
    }
}

function getKeyTags(apiKeyId) {
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