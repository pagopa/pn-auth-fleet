const { validation } = require("./validation.js");
const Redis = require("./redis.js");
const { parseMethodArn, isLogoutRequest } = require("./methodArn.js");
const policies = require("../policies");
const { denyAllPolicy } = policies;

async function handleEvent(event) {
  // Declare Policy
  let iamPolicy = null;
  // Capture apiKey from event
  const encodedToken = event?.authorizationToken?.replace("Bearer ", "");
  if (!encodedToken) {
    console.warn("EncodedToken is null");
    return denyAllPolicy;
  }
  console.log("encodedToken", encodedToken);
  
  try {
    const decodedToken = await validation(encodedToken);
    console.log("decodedToken", decodedToken);

    if (await Redis.isJtiRevoked(decodedToken.jti)) {
      console.log(`Jti ${decodedToken.jti} is revoked`);
      return denyAllPolicy;
    }

    const contextAttrs = {};
    contextAttrs.sourceChannel = "WEB";
    contextAttrs.uid = decodedToken.uid;
    contextAttrs.cx_type = getUserType(decodedToken);
    const prefix = ["PA", "BS"].includes(contextAttrs.cx_type) ? "" : contextAttrs.cx_type + "-";
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
    const policyParams = { ...parseMethodArn(event.methodArn), contextAttrs };
    if (isLogoutRequest(event.methodArn)) {
      // La logout è consentita a tutti i cx_type
      iamPolicy = policies.buildLogoutPolicy(policyParams);
    } else {
      iamPolicy = policies.buildCxTypePolicy(contextAttrs.cx_type, policyParams);
    }
    console.log("IAM Policy", JSON.stringify(iamPolicy));
    return iamPolicy;
  } catch (err) {
    if (err.name == "ValidationException") {
      console.warn("Error generating IAM policy ", err);
    } else {
      console.error("Error generating IAM policy ", err);
    }
    return denyAllPolicy;
  }
}

function getUserType(token) {
  if (!token.organization) {
    return "PF";
  }
  if (token.organization.role?.startsWith("pg-")) {
    return "PG";
  }
  if (token.organization.role === "support") {
    return "BS";
  }
  return "PA";
}

module.exports = { handleEvent };
