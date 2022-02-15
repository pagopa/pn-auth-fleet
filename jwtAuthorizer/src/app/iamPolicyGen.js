const apiPermissions = [
    {
        "arn": `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.ACCOUNT_ID}:${process.env.API_ID}`,
        "resource": "*",
        "stage": "*",
        "httpVerb": "*"
    }
];

module.exports = {
    async generateIAMPolicy(resourceArn, contextAttr) {
        // Declare empty policy statements array
        let policyStatement = generatePolicyStatement(resourceArn, "Allow");
        // Iterate over API Permissions
        // Check if no policy statements are generated, if so, create default deny all policy statement
        if (policyStatement) {
            return generatePolicy('user', contextAttr, policyStatement);
        } else {
            throw "Unable to generate policy statement" ; //TODO Exception
        }
    }
}

function generatePolicyStatement(resourceArn, action) {
    let resources = resourceArn.split('/')
    console.debug( 'resources', resources )
    if ( resources.length >=2 ) {
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

function generatePolicy(principalId, contextAttr, policyStatement) {
    // Generate a fully formed IAM policy
    const authResponse = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [policyStatement]
        },
        context: contextAttr
    };
    return authResponse;
}
