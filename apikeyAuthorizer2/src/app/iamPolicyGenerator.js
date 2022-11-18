const { ValidationException } = require("./exceptions");

module.exports = {
    generateIAMPolicy : (resourceArn, contextAttr, apiKey) => {
        let policyStatement = generatePolicyStatement(resourceArn, "Allow");
        // Check if no policy statements are generated, if so, create default deny all policy statement
        if (policyStatement) {
            return generatePolicy('user', contextAttr, policyStatement, apiKey);
        } else {
            throw new ValidationException("Unable to generate policy statement");
        }
    }
};

function generatePolicyStatement(resourceArn, action) {
    let resources = resourceArn.split('/');
    console.debug( 'arn resources', resources );
    if ( resources.length >=2 ) {
        let resource = `${resources[0]}/${resources[1]}/*`;
        // Generate an IAM policy statement
        return {
            Action: 'execute-api:Invoke',
            Effect: action,
            Resource: resource
        };
    } else {
        console.error('Unable to generate policy statement for resource arn=%s', resourceArn);
        return null;
    }
}

function generatePolicy(principalId, contextAttr, policyStatement, apiKey) {
    // Generate a fully formed IAM policy
    return {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [policyStatement]
        },
        context: contextAttr,
        usageIdentifierKey: apiKey
    };
}
