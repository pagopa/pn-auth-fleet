const { getCxId } = require("./dataVaultClient.js");
const { generateIAMPolicy } = require("./iamPolicyGen.js");

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

const handleEvent = async (event) => {
  // Declare Policy
  let iamPolicy = null;

  // Capture taxId from event
  const taxId = event?.headers?.["x-pagopa-cx-taxid"];
  if (taxId) {
    // console.info('taxId', taxId); non si può loggare il codice fiscale, magari mettiamo solo un pezzo!
    try {
      const cxId = await getCxId(taxId);
      console.info("cxId", cxId);
      // Generate IAM Policy
      iamPolicy = await generateIAMPolicy(event.methodArn, cxId);
      console.log("IAM Policy", JSON.stringify(iamPolicy));
      return iamPolicy;
    } catch (err) {
      console.error("Error generating IAM policy with error ", err);
      return defaultDenyAllPolicy;
    }
  } else {
    console.error("taxId is null");
    return defaultDenyAllPolicy;
  }
};

module.exports = { handleEvent };
