const { validateLollipopAuthorizer } = require('../app/lollipopAuthorizerValidation');
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

    console.log("[handleEvent] Lollipop Authorizer Validation Allowed");
    let commandResult;
    let commandResultName ='';
    let commandResultFamilyName='';
    try {
          const request = {
            // Mapping degli header ricevuti dall'evento
            headerParams: {
                headers: event.headers || {}
            },
          };

          commandResult = await validateLollipopAuthorizer(request);
          if(commandResult.statusCode !== 200){
            console.error("[validateLollipopAuthorizer] - Validazione fallita");
            return defaultDenyAllPolicy;
          }

          // Capture taxId from event
          const taxId = event?.headers?.["x-pagopa-cx-taxid"];
          if (!taxId) {
              console.error("Header 'x-pagopa-cx-taxid' is missing. Denying access.");
              return defaultDenyAllPolicy;
          }
          const cxId = await getCxId(taxId);
          console.log("cxId", cxId);

          const contextMap = {
              name: commandResult.name || '',
              familyName: commandResult.familyName || '',
              cxId: cxId,
          };

          // Generate IAM Policy
          const iamPolicy = await generateIAMPolicy(event.methodArn, cxId, contextMap);
          console.debug("IAM Policy ", JSON.stringify(iamPolicy));
          return iamPolicy;
    } catch (error) {
        console.error("Lollipop Authorizer Validation - Error during authorization flow (get/generate policy): ", error);
        return defaultDenyAllPolicy;
    }
}


module.exports = { handleEvent };
