const iamPolicyGenerator = require('./iamPolicyGen.js')
const keyTagsGetter = require('./keyTagsGetter.js')
const PA_TAG_NAME = process.env.PA_TAG_NAME

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
        try {
            let response =  await keyTagsGetter.getKeyTags(apiKeyId);
            console.log('response', response);
            // Retrieve token scopes
            const paId = response.tags[PA_TAG_NAME];
            console.log('ApiKey paId Tags', paId);
            // Generate IAM Policy
            iamPolicy = iamPolicyGenerator.generateIAMPolicy(event.methodArn, paId); //FIX event.methodArn
            console.log('IAM Policy', JSON.stringify(iamPolicy));
            return iamPolicy;
        } catch(err) {
            console.log(err);
            iamPolicy = defaultDenyAllPolicy;
        }
    }
}
