module.exports = {
    async generateIAMPolicy(resourceArn, paId) {
        let policyStatement = generatePolicyStatement(resourceArn, "Allow");
        if (policyStatement) {
            console.debug( 'Policy statement generated', policyStatement )
            return generatePolicy('user', paId, policyStatement);
        } else {
            throw "Unable to generate policy statement" ; //TODO Exception
        }
    }
}

function generatePolicyStatement(resourceArn, action) {
    let resources = resourceArn.split('/')
    console.debug( 'resources', resources )
    if (resources.length >= 2) {
        let resource = resources[0] + '/' + resources[1] + '/*'
        // Generate an IAM policy statement
        return {
            Action: 'execute-api:Invoke',
            Effect: action,
            Resource: resource
        };
    } else {
        console.error('Unable to generate policy statement for resource arn=%s', resourceArn)
        return null;
    }
}

function generatePolicy(principalId, paId, policyStatement) {
    // Generate a fully formed IAM policy
    const authResponse = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [policyStatement]
        },
        context: { "pa_id": paId }
    };
    return authResponse;
}
