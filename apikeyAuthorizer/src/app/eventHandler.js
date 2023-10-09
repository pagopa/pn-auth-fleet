import { generateIAMPolicy } from "./iamPolicyGen.js";
import { getKeyTags } from "./keyTagsGetter.js";
const PA_TAG_NAME = process.env.PA_TAG_NAME;
const GROUPS_TAG_NAME = process.env.GROUPS_TAG_NAME;

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
  const apiKeyId = event?.requestContext?.identity?.apiKeyId;
  if (apiKeyId) {
    console.info("ApiKeyId", apiKeyId);
    try {
      const response = await getKeyTags(apiKeyId);
      console.log("Get key tags response", response);
      // Retrieve token scopes
      const paId = response.tags[PA_TAG_NAME];
      console.log("ApiKey paId Tags", paId);
      const groups = response.tags[GROUPS_TAG_NAME];
      console.log("ApiKey groups Tags", groups);
      // Generate IAM Policy
      iamPolicy = await generateIAMPolicy(
        event.methodArn,
        paId,
        apiKeyId,
        groups
      );
      console.log("IAM Policy", JSON.stringify(iamPolicy));
      return iamPolicy;
    } catch (err) {
      console.error("Error generating IAM policy with error ", err);
      return defaultDenyAllPolicy;
    }
  } else {
    console.error("ApiKeyID is null");
    return defaultDenyAllPolicy;
  }
}

export { handleEvent };
