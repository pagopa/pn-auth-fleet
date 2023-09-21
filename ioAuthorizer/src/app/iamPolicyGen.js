import { ValidationException } from "./exception/validationException.js";

const generateIAMPolicy = async (resourceArn, cxId) => {
  let policyStatement = generatePolicyStatement(resourceArn, "Allow");
  if (policyStatement) {
    console.debug("Policy statement generated", policyStatement);
    return generatePolicy("user", cxId, policyStatement);
  } else {
    throw new ValidationException("Unable to generate policy statement");
  }
};

function generatePolicyStatement(resourceArn, action) {
  let resources = resourceArn.split("/");
  console.debug("resources", resources);
  if (resources.length >= 2) {
    let resource = resources[0] + "/" + resources[1] + "/*";
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

function generatePolicy(principalId, cxId, policyStatement) {
  // Generate a fully formed IAM policy
  return {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [policyStatement],
    },
    context: {
      cx_id: cxId,
      cx_type: "PF",
      uid: "IO-" + cxId,
    },
  };
}

export { generateIAMPolicy };
