const iamPolicyGenerator = require('./iamPolicyGen.js')
const dataVaultClient = require('./dataVaultClient.js')
const PA_TAG_NAME = process.env.PA_TAG_NAME
const GROUPS_TAG_NAME = process.env.GROUPS_TAG_NAME

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

        // Capture taxId from event
        const taxId = event?.requestContext?.identity['x-pagopa-cx-taxid'];
        const ioUid = event?.headers?.uid;
        if( taxId )
        {
            // console.info('taxId', taxId); non si può loggare il codice fiscale, magari mettiamo solo un pezzo!
            try {
                let cxId = await dataVaultClient.getCxId(taxId);

                // Generate IAM Policy
                iamPolicy = await iamPolicyGenerator.generateIAMPolicy("user", cxId, ioUid, policyStatement);
                console.log('IAM Policy', JSON.stringify(iamPolicy));
                return iamPolicy;
            } catch(err) {
                console.error('Error generating IAM policy with error ',err);
                return defaultDenyAllPolicy;
            }
            
        } else {
            console.error('taxId is null')
            return defaultDenyAllPolicy;
        }
    }
}
