const apiPermissions = [
    {
        "arn": `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:${process.env.API_ID}`, // NOTE: Replace with your API Gateway API ARN
        "resource": "*", // NOTE: Replace with your API Gateway Resource
        "stage": "*", // NOTE: Replace with your API Gateway Stage
        "httpVerb": "*" // NOTE: Replcae with the HTTP Verbs you want to allow access your REST Resource
        // "scope": "email" // NOTE: Replace with the proper OAuth scopes that can access your REST Resource
    }
];

module.exports = {
    async generateIAMPolicy(resourceArn, contextAttr) {
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
}

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