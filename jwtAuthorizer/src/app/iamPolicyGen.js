const ValidationException = require("./exception/validationException.js");

async function generateIAMPolicy(resourceArn, contextAttr) {
  const policyStatement = generatePolicyStatement(resourceArn, "Allow");
  // Check if no policy statements are generated, if so, create default deny all policy statement
  if (policyStatement) {
    return generatePolicy("user", contextAttr, policyStatement);
  } else {
    throw new ValidationException("Unable to generate policy statement");
  }
}

function generatePolicyStatement(resourceArn, action) {
  const resources = resourceArn.split("/");
  console.debug("resources", resources);
  if (resources.length >= 2) {
    const resource = resources[0] + "/" + resources[1] + "/*";
    // Generate an IAM policy statement
    return {
      Action: "execute-api:Invoke",
      Effect: action,
      Resource: resource,
    };
  } else {
    console.error(
      "Unable to generate policy statement for resource arn=%s",
      resourceArn
    );
    return null;
  }
}

function generatePolicy(principalId, contextAttr, policyStatement) {
  // Generate a fully formed IAM policy
  const authResponse = {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [policyStatement],
    },
    context: contextAttr,
  };
  return authResponse;
}

module.exports = { generateIAMPolicy };
