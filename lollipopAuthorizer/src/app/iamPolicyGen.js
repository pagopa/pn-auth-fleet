const ValidationException = require("./exception/validationException.js");

async function generateIAMPolicy(resourceArn, contextMap) {
    if (!contextMap || !resourceArn ) {
        throw new Error('Missing required arguments for policy generation.');
    }
  const policyStatement = generatePolicyStatement(resourceArn, "Allow");
  if (policyStatement) {
    console.debug("Policy statement generated", policyStatement);
    return generatePolicy("user", policyStatement, contextMap);
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

function generatePolicy(principalId, policyStatement, contextMap) {
  let resultCode = '';
  let nome = '';
  let cognome = '';
  let cxId = '';
  let sourceDetails = '';
  if (contextMap && Object.keys(contextMap).length > 0) {
        if('resultCode' in contextMap) {
            resultCode = contextMap.resultCode;
        }
        if ('name' in contextMap) {
            nome = contextMap.name;
        }
        if ('familyName' in contextMap) {
            cognome = contextMap.familyName;
        }
        if ('cxId' in contextMap) {
            cxId = contextMap.cxId;
        }
        if ('sourceChannelDetails' in contextMap) {
            sourceDetails = contextMap.sourceChannelDetails;
        }
  }
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
      name: nome,
      familyName: cognome,
      resultCode: resultCode,
      sourceChannelDetails: sourceDetails,
    },
  };
}

module.exports = { generateIAMPolicy };
