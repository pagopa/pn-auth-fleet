const iamPolicyGenerator = require('./iamPolicyGen.js')
const keyTagsGetter = require('./keyTagsGetter.js')
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
        await keyTagsGetter.getKeyTags(apiKeyId).then(data => {
            console.log('data', data);
            // Retrieve token scopes
            const paId = data.tags[PAID_TAG];
            console.log('ApiKey paId Tags', paId);
            // Generate IAM Policy
            iamPolicy = iamPolicyGenerator.generateIAMPolicy(event.methodArn, paId); //FIX event.methodArn
        })
        .catch(err => {
            console.log(err);
            iamPolicy = defaultDenyAllPolicy;
        });
        console.log('IAM Policy', JSON.stringify(iamPolicy));
        return iamPolicy;
    }
}
