const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');
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
    async handleEvent(event, cachedPublicKey){
        
        // Declare Policy
        let iamPolicy = null;
        // Capture apiKey from event
        const encodedToken = event.authorizationToken.replace('Bearer ','');
        console.log('encodedToken', encodedToken);

        try{
            let decodedToken = await validator.validation(encodedToken, cachedPublicKey);
            console.log('decodedToken', decodedToken);

            let contextAttrs = {};
            contextAttrs.user_id = decodedToken.uid;
            contextAttrs.user_role = decodedToken.organization.role;
            contextAttrs.pa_id = decodedToken.organization.id;
            console.log('contextAttrs ', contextAttrs);

            // Generate IAM Policy
            iamPolicy = await iamPolicyGenerator.generateIAMPolicy(event.methodArn, contextAttrs);  //TODO fix event.methodArn policyStatement
            console.log('IAM Policy', JSON.stringify(iamPolicy));
            return iamPolicy;
        }catch(err){
            console.error('Error ',err);
            return defaultDenyAllPolicy;
        }
    }
}


/*
function findKey(jwks, kid) {
    console.log('XXXXX', jwks);
    //console.log('len', response.data.keys.length);
    for (let index = 0; index < jwks.keys.length; index++) {
        const key = jwks.keys[index];
        console.log('keyID', key.kid, key.kid === kid);
        if (key.kid === kid) {
            console.log('Found key', key.kid);
            return key;
        }
    }
}

function getJwkByKid(iss, kid) {
    //TODO: sostituzione url cablato con check iss (vedi SELC-390)
    const jwksendpoint = 'https://uat.selfcare.pagopa.it/.well-known/jwks.json';
    console.log('jwksendpoint', jwksendpoint);
    
    return fetch(jwksendpoint)
    .then(res => res.json())
    .then((json) => {
        return findKey(json, kid)
    })
    .catch((error) => { throw error;});
}*/