const validator = require('./validation.js')
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
        // Capture apiKey from event
        const encodedToken = event?.authorizationToken?.replace('Bearer ','');
        if (encodedToken) {
            console.log('encodedToken', encodedToken);
            try {
                let decodedToken = await validator.validation(encodedToken);
                console.log('decodedToken', decodedToken);
                
                let contextAttrs = {};
                contextAttrs.uid = decodedToken.uid;
                contextAttrs.cx_id = decodedToken.organization? decodedToken.organization.id : ('PF-' + decodedToken.uid);
                contextAttrs.cx_type = decodedToken.organization? 'PA' : 'PF';
                contextAttrs.cx_groups = decodedToken.organization?JSON.stringify(decodedToken.organization.groups): '[]';
                contextAttrs.cx_role = decodedToken.organization?.role;
                console.log('contextAttrs ', contextAttrs);
                
                // Generate IAM Policy
                iamPolicy = await iamPolicyGenerator.generateIAMPolicy(event.methodArn, contextAttrs);
                console.log('IAM Policy', JSON.stringify(iamPolicy));
                return iamPolicy;
            } catch(err) {
                console.error('Error generating IAM policy ',err);
                return defaultDenyAllPolicy;
            }
        } else {
            console.error('EncodedToken is null')
            return defaultDenyAllPolicy;
        } 
    }
}
