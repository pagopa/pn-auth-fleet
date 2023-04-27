const validator = require('./validation.js');
const iamPolicyGenerator = require('./iamPolicyGen.js');

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
                contextAttrs.cx_type = getUserType(decodedToken);
                let prefix = (contextAttrs.cx_type == 'PA' ? '' : contextAttrs.cx_type + '-')
                contextAttrs.cx_id = prefix + (decodedToken.organization ? decodedToken.organization.id : decodedToken.uid )

                contextAttrs.cx_groups = decodedToken.organization?.groups?.join();
                contextAttrs.cx_role = decodedToken.organization?.role.replace(/pg-/, "");
                contextAttrs.cx_jti = decodedToken.jti;
                console.log('contextAttrs ', contextAttrs);
                
                // Generate IAM Policy
                iamPolicy = await iamPolicyGenerator.generateIAMPolicy(event.methodArn, contextAttrs);
                console.log('IAM Policy', JSON.stringify(iamPolicy));
                return iamPolicy;
            } catch(err) {
                if(err.name=='ValidationException'){
                    console.warn('Error generating IAM policy ',err);
                } else {
                    console.error('Error generating IAM policy ',err);
                }
                return defaultDenyAllPolicy;
            }
        } else {
            console.warn('EncodedToken is null')
            return defaultDenyAllPolicy;
        } 
    }
}

function getUserType(token) {
    if (!token.organization) {
        return 'PF';
    }
    if (token.organization && token.organization.role?.startsWith('pg-')) {
        return 'PG';
    }
    if (token.organization) {
        return 'PA';
    }
}