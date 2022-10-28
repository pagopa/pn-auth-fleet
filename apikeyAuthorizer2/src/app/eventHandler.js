const dynamo = require('./dynamoFunctions.js');
const { KeyStatusException } = require('./exceptions.js');
const iam = require('./iamPolicyGenerator.js');

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

module.exports.eventHandler = async (event, context) => {
    try {
        const virtualKey = event.headers["x-api-key"];
        
        const apiKeyDynamo = await dynamo.getApiKeyByIndex(virtualKey);
        
        if(!checkStatus(apiKeyDynamo.status)) {
            throw new KeyStatusException(`Key is not allowed with status ${apiKeyDynamo.status}`);
        }

        const paAggregationDynamo = await dynamo.getPaAggregationById(apiKeyDynamo.cxId);

        const aggregateDynamo = await dynamo.getPaAggregateById(paAggregationDynamo.aggregateId);

        console.log("AWS ApiKey Found -> ", aggregateDynamo.AWSApiKey);

        const contextAuth = {
            "x-pagopa-pn-uid": "apiKey-" + aggregateDynamo.AWSApiKey,
            "x-pagopa-pn-cx-id": apiKeyDynamo.cxId,
            "x-pagopa-pn-cx-groups": apiKeyDynamo?.groups?.join(),
            "x-pagopa-pn-cxtype": "PA"
        };

        const iamPolicy = iam.generateIAMPolicy(event.methodArn, contextAuth, aggregateDynamo.AWSApiKey);
        console.log("IAM Policy:", iamPolicy);

        return iamPolicy;
    } catch (error) {
        console.error('Error generating IAM policy with error ', error);
        return defaultDenyAllPolicy;
    }
}; 

function checkStatus(status) {
    return status === 'ENABLED' || status === 'ROTATED';
}
