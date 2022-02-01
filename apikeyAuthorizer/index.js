const AWS = require('aws-sdk');
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

function generatePolicyStatement(resourceArn, action) {
    // Generate an IAM policy statement
    const statement = {};
    statement.Action = 'execute-api:Invoke';
    statement.Effect = action;
    statement.Resource = resourceArn;
    return statement;
}

function generatePolicy(principalId, paId, policyStatements) {
    // Generate a fully formed IAM policy
    const authResponse = {};
    authResponse.principalId = principalId;
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = policyStatements;
    authResponse.policyDocument = policyDocument;
    authResponse.context = { "pa_id": paId };
    return authResponse;
}

function generateIAMPolicy(resourceArn, paId) {
    // Declare empty policy statements array
    const policyStatements = [];
    policyStatements.push(generatePolicyStatement(resourceArn, "Allow"));

    // Check if no policy statements are generated, if so, create default deny all policy statement
    if (policyStatements.length === 0) {
        return defaultDenyAllPolicy;
    } else {
        return generatePolicy('user', paId, policyStatements);
    }
}

exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
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
        iamPolicy = generateIAMPolicy(event.methodArn, paId);
    })
    .catch(err => {
        console.log(err);
        iamPolicy = defaultDenyAllPolicy;
    });
    console.log('IAM Policy', JSON.stringify(iamPolicy));
    return iamPolicy;
};

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