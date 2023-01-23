const dynamo = require('./dynamoFunctions.js');
const { KeyStatusException } = require('./exceptions.js');
const iam = require('./iamPolicyGenerator.js');
const utils = require("./utils");

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
        console.log("Aggregate ID found -> ", paAggregationDynamo.aggregateId)

        const aggregateDynamo = await dynamo.getPaAggregateById(paAggregationDynamo.aggregateId);
        console.log("AWS ApiKey Found -> ", utils.anonymizeKey(aggregateDynamo.AWSApiKey));

        const contextAuth = {
            "uid": "APIKEY-" + aggregateDynamo.AWSApiKey,
            "cx_id": apiKeyDynamo.cxId,
            "cx_groups": apiKeyDynamo?.groups?.join(),
            "cx_type": "PA"
        };

        const iamPolicy = iam.generateIAMPolicy(event.methodArn, contextAuth, aggregateDynamo.AWSApiKey);
        
        //merge the iamPolicy retrieved object, with the anonymized apikey to prevent display in log.
        const loggedIamPolicy = {...iamPolicy, usageIdentifierKey: utils.anonymizeKey(iamPolicy.usageIdentifierKey)}
        console.log("IAM Policy:", loggedIamPolicy);

        return iamPolicy;
    } catch (error) {
        console.error('Error generating IAM policy with error ', error);
        return defaultDenyAllPolicy;
    }
}; 

function checkStatus(status) {
    return status === 'ENABLED' || status === 'ROTATED';
}
