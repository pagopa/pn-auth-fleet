const jsonwebtoken = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');

const apiPermissions = [
    {
        "arn": `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:${process.env.API_ID}`, // NOTE: Replace with your API Gateway API ARN
        "resource": "*", // NOTE: Replace with your API Gateway Resource
        "stage": "*", // NOTE: Replace with your API Gateway Stage
        "httpVerb": "*" // NOTE: Replcae with the HTTP Verbs you want to allow access your REST Resource
       // "scope": "email" // NOTE: Replace with the proper OAuth scopes that can access your REST Resource
    }
];

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

function generatePolicy(principalId, contextAttr, policyStatements) {
    // Generate a fully formed IAM policy
    const authResponse = {};
    authResponse.principalId = principalId;
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = policyStatements;
    authResponse.policyDocument = policyDocument;
    authResponse.context = contextAttr;
    return authResponse;
}

function generateIAMPolicy(resourceArn, contextAttr) {
    // Declare empty policy statements array
    const policyStatements = [];
    policyStatements.push(generatePolicyStatement(resourceArn, "Allow"));
    // Iterate over API Permissions
    for (let i = 0; i < apiPermissions.length; i++) {
        // Check if token scopes exist in API Permission
        //if (scopeClaims.indexOf(apiPermissions[i].scope) > -1) {
            // User token has appropriate scope, add API permission to policy statements
            //policyStatements.push(generatePolicyStatement(apiPermissions[i].arn, apiPermissions[i].stage,
            //    apiPermissions[i].httpVerb, apiPermissions[i].resource, "Allow"));
        //}
    }
    // Check if no policy statements are generated, if so, create default deny all policy statement
    if (policyStatements.length === 0) {
        return defaultDenyAllPolicy;
    } else {
        return generatePolicy('user', contextAttr, policyStatements);
    }
}

exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    // Declare Policy
    let iamPolicy = null;

    // Capture apiKey from event
    const encodedToken = event.authorizationToken;
    console.log('encodedToken', encodedToken);
    return jwtValidator(encodedToken).then(decodedToken => {
        console.log('decodedToken', decodedToken);
        let contextAttrs = {};
        contextAttrs.user_id = decodedToken.uid;
        contextAttrs.user_role = decodedToken.organization.role;
        contextAttrs.pa_id = decodedToken.organization.id;
        console.log('contextAttrs ', contextAttrs);
        // Generate IAM Policy
        iamPolicy = generateIAMPolicy(event.methodArn, contextAttrs);
        console.log('IAM Policy', JSON.stringify(iamPolicy));
        return iamPolicy;
    })
    .catch(err => {
        console.log(err);
        return defaultDenyAllPolicy;
    });
};

function jwtValidator(jwtToken) {
    const token = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token', token)
    let kid = token.header.kid;
    console.log('kid', kid)
    return getJwkByKid(token.payload.iss, token.header.kid).then((jwk) => {
        console.log('jwk ', jwk);
        const pem = jwkToPem(jwk);
        jsonwebtoken.verify(jwtToken, pem);
        console.log("success!");
        return token.payload;
    })
}

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
}