const { validateLollipopAuthorizer } = require('./lollipopAuthorizerValidation');
const { generateIAMPolicy } = require("./iamPolicyGen");
const { getCxId } = require("./dataVaultClient");

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

    const lollipopBlock = process.env.LOLLIPOP_BLOCK;
    console.log("[handleEvent] Lollipop Authorizer Validation Allowed - Modalita: ", lollipopBlock);

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
            // ATTENZIONE: IN FASE DI Enforcement, la variabile lollipopBlock deve essere valorizzato a true
            if (String(lollipopBlock).toLowerCase() === "true") {
              if(commandResult.statusCode !== 200){
                console.error(`[handleEvent] - Validazione fallita: ${commandResult.resultCode}. Denying access.`);
                return defaultDenyAllPolicy;
              }
            }else{
              if(commandResult.statusCode !== 200){
                  console.warn(`[handleEvent] - Validazione fallita: ${commandResult.resultCode}. Denying access.`);
              }
            }
      } catch (error) {
            if (String(lollipopBlock).toLowerCase() === "true") {
                  console.error(`[handleEvent] - Lollipop Authorizer Validation fallita: ${commandResult.resultCode}. Denying access.`);
                  return defaultDenyAllPolicy;
            }else{
                  console.warn("Lollipop Authorizer Validation - ErrorCode: ", error.errorCode, " - Message: ", error.message);
            }
      }

      try{

          // Capture taxId from event
          const taxId = event?.headers?.["x-pagopa-cx-taxid"];
          if (!taxId) {
              console.error("Header 'x-pagopa-cx-taxid' is missing. Denying access.");
              return defaultDenyAllPolicy;
          }
          const cxId = await getCxId(taxId);
          if (!cxId) {
              // Caso "User Not Found": Il taxId non è censito nel DataVault/DB
              let statusCode = 404;
              let resultCode = "USER_NOT_FOUND";
              console.error(`[handleEvent] - ending statusCode: ${statusCode} - resultCode: ${resultCode} - User not found for taxId. Denying access.`);
              return defaultDenyAllPolicy;
          }
          console.log(`[handleEvent] User found: ${cxId}`);

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
        console.error("Lollipop Authorizer Validation - Error during authorization flow (get/generate policy): ", error.errorCode, " - Message: ", error.message);
        return defaultDenyAllPolicy;
    }
}


module.exports = { handleEvent };
