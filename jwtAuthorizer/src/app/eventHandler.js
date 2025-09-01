const { generateIAMPolicy } = require("./iamPolicyGen.js");
const { validation } = require("./validation.js");
const Redis = require("./redis.js");

const defaultDenyAllPolicy = {
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ],
  },
};

async function handleEvent(event) {
  // Declare Policy
  let iamPolicy = null;
  // Capture apiKey from event
  const encodedToken = event?.authorizationToken?.replace("Bearer ", "");
  if (!encodedToken) {
    console.warn("EncodedToken is null");
    return defaultDenyAllPolicy;
  }
  console.log("encodedToken", encodedToken);
  
  try {
    const decodedToken = await validation(encodedToken);
    console.log("decodedToken", decodedToken);

    if (await Redis.isJtiRevoked(decodedToken.jti)) {
      console.log(`Jti ${decodedToken.jti} is revoked`);
      return defaultDenyAllPolicy;
    }

    const contextAttrs = {};
    contextAttrs.sourceChannel = "WEB";
    contextAttrs.uid = decodedToken.uid;
    contextAttrs.cx_type = getUserType(decodedToken);
    const prefix =
      contextAttrs.cx_type == "PA" ? "" : contextAttrs.cx_type + "-";
    contextAttrs.cx_id =
      prefix +
      (decodedToken.organization
        ? decodedToken.organization.id
        : decodedToken.uid);

    contextAttrs.cx_groups = decodedToken.organization?.groups?.join();
    contextAttrs.cx_role = decodedToken.organization?.role.replace(/pg-/, "");
    contextAttrs.cx_jti = decodedToken.jti;
    if (decodedToken.source) {
      contextAttrs.sourceChannel = decodedToken.source.channel;
      contextAttrs.sourceChannelDetails = decodedToken.source.details;
    }
    console.log("contextAttrs ", contextAttrs);

    // Generate IAM Policy
    iamPolicy = await generateIAMPolicy(event.methodArn, contextAttrs);
    console.log("IAM Policy", JSON.stringify(iamPolicy));
    return iamPolicy;
  } catch (err) {
    if (err.name == "ValidationException") {
      console.warn("Error generating IAM policy ", err);
    } else {
      console.error("Error generating IAM policy ", err);
    }
    return defaultDenyAllPolicy;
  }
}

function getUserType(token) {
  if (!token.organization) {
    return "PF";
  }
  if (token.organization && token.organization.role?.startsWith("pg-")) {
    return "PG";
  }
  if (token.organization) {
    return "PA";
  }
}

module.exports = { handleEvent, defaultDenyAllPolicy };
