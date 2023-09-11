const iamPolicyGenerator = require('./iamPolicyGen.js')

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

        // Capture uid from event
        const uid = event?.headers?.['x-pagopa-pn-uid'];
        if( uid )
        {
            try {
                console.info('uid', uid);
                // Generate IAM Policy
                iamPolicy = await iamPolicyGenerator.generateIAMPolicy(event.methodArn, uid);
                console.log('IAM Policy', JSON.stringify(iamPolicy));
                return iamPolicy;
            } catch(err) {
                console.error('Error generating IAM policy with error ',err);
                return defaultDenyAllPolicy;
            }
            
        } else {
            console.error('uid is null')
            return defaultDenyAllPolicy;
        }
    }
}
