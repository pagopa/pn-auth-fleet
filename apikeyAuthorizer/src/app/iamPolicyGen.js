module.exports = {
    async generateIAMPolicy(resourceArn, paId) {
        // Declare empty policy statements array
        const policyStatements = [];
        policyStatements.push(generatePolicyStatement(resourceArn, "Allow"));
        
        // Check if no policy statements are generated, if so, create default deny all policy statement
        if (policyStatements.length === 0) {
            return defaultDenyAllPolicy;
        } else {
            return generatePolicy('user', paId, policyStatements);
        }
    }
}

function generatePolicyStatement(resourceArn, action) {
    let resources = resourceArn.split('/')
    let resource = resources[0] + '/' + resources[1] + '/*'
    // Generate an IAM policy statement
    const statement = {};
    statement.Action = 'execute-api:Invoke';
    statement.Effect = action;
    statement.Resource = resource;
    return statement;
}

function generatePolicy(principalId, paId, policyStatements) {
    // Generate a fully formed IAM policy
    const authResponse = {};
    authResponse.principalId = principalId;
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = policyStatements;
    authResponse.policyDocument = policyDocument;
    authResponse.context = { "pa_id": paId };
    return authResponse;
}
