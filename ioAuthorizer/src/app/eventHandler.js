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

async function handleEvent(event) {
  // Declare Policy
  let iamPolicy = null;

  // Capture taxId from event
  const taxId = event?.headers?.["x-pagopa-cx-taxid"];
  const userId = event?.headers?.["x-pagopa-lollipop-user-id"];

   if (!taxId || !userId) {
      console.error("Missing taxId or userId");
      return defaultDenyAllPolicy;
    } else if (taxId !== userId) {
        console.error("Mismatch between taxId and userId.");
      return defaultDenyAllPolicy;
    } else {
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
  }
}

module.exports = { handleEvent };
