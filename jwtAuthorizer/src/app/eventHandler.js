const { generateIAMPolicy } = require("./iamPolicyGen.js");
const { validation } = require("./validation.js");
const Redis = require("./redis.js");
const { getSupportPolicy, getPtPolicy } = require("./policyAuthorizer.js");
const { denyAllPolicy } = require("../policies");
const ValidationException = require("./exception/validationException.js");

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
    const prefix = ["PA", "BS", "PT"].includes(contextAttrs.cx_type) ? "" : contextAttrs.cx_type + "-";
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
    if (contextAttrs.cx_type === "BS") {
      iamPolicy = await getSupportPolicy(event, contextAttrs);
    } else if (contextAttrs.cx_type === "PT") {
      iamPolicy = await getPtPolicy(event, contextAttrs);
    } else {
      iamPolicy = await generateIAMPolicy(event.methodArn, contextAttrs);
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

const INSTITUTION_TYPES = ["PA", "PG", "PT"];

function getUserType(token) {
  if (!token.organization) {
    return "PF";
  }
  if (token.organization.role === "support") {
    return "BS";
  }

  const institutionType = token.organization.institutionType;
  if (institutionType) {
    if (!INSTITUTION_TYPES.includes(institutionType)) {
      throw new ValidationException(`institutionType ${institutionType} not supported`);
    }
    return institutionType;
  }

  /* Retrocompatibility for tokens issued before institutionType was added to the session token */
  if (token.organization.role?.startsWith("pg-")) {
    return "PG";
  }
  return "PA";
}

module.exports = { handleEvent };
