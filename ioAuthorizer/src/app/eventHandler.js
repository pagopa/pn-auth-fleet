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

const ACCEPTED_SOURCE_DETAILS = ["QR_CODE", ""]

function validateSourceDetails(sourceDetails) {
  if(sourceDetails) {
    return ACCEPTED_SOURCE_DETAILS.includes(sourceDetails);
  }
  return true; // If no source details are provided, we assume it's valid
}

/**
1. Se manca il taxId, la validazione viene rifiutata (è obbligatorio)
2. Se è presente userId (header lollipop), viene confrontato (uppercase) con il taxId
3. Se userId non è presente, il controllo sugli header va avanti in quanto è necessario obbligatoriamente solo il taxId
*/
async function handleEvent(event) {
  // Declare Policy
  let iamPolicy = null;

  // Capture taxId from event
  const taxId = event?.headers?.["x-pagopa-cx-taxid"];
  const userId = event?.headers?.["x-pagopa-lollipop-user-id"];
  const sourceDetails = event?.headers?.["x-pagopa-pn-io-src"];
  if(!validateSourceDetails(sourceDetails)) {
    console.error("Invalid source details header", sourceDetails);
    return defaultDenyAllPolicy;
  }
  
   if (!taxId) {
      console.error("Missing taxId or userId");
      return defaultDenyAllPolicy;
    } else if (userId && taxId.toUpperCase() !== userId.toUpperCase()) {
        console.error("Mismatch between taxId and userId.");
      return defaultDenyAllPolicy;
    } else {
        console.info("Match found between taxId and userId")
    try {
      const cxId = await getCxId(taxId);
      console.info("cxId", cxId);
      // Generate IAM Policy
      iamPolicy = await generateIAMPolicy(event.methodArn, cxId, sourceDetails);
      console.log("IAM Policy", JSON.stringify(iamPolicy));
      return iamPolicy;
    } catch (err) {
      console.error("Error generating IAM policy with error ", err);
      return defaultDenyAllPolicy;
    }
  }
}

module.exports = { handleEvent };
