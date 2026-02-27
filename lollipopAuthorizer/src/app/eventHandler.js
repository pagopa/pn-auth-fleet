import { validateLollipopAuthorizer  } from "./lollipopAuthorizerValidation.js";
import { generateIAMPolicy  } from "./iamPolicyGen.js";
import { getCxId  } from "./dataVaultClient.js";
import { lollipopConfig } from './config/lollipopConsumerRequestConfig.js';

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

async function handleEvent(event) {

    console.log("event: %o", event);
    // Declare Policy
    let iamPolicy = null;

    let lollipopBlock;
    if( process.env.LOLLIPOP_BLOCK === undefined || process.env.LOLLIPOP_BLOCK === '')
        lollipopBlock = lollipopConfig.lollipopBlock;
    else
        lollipopBlock = process.env.LOLLIPOP_BLOCK;

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
              const resultCode = commandResult?.resultCode ?? 'UNKNOWN';
              console.error(`[handleEvent] - Lollipop Authorizer Validation fallita: ${resultCode}. Denying access.`);
              return defaultDenyAllPolicy;
        }else{
              console.warn("Lollipop Authorizer Validation - ErrorCode: ", error.errorCode, " - Message: ", error.message);
        }
    }

    try{
        const taxId = event?.headers?.["x-pagopa-cx-taxid"];
        const userId = event?.headers?.["x-pagopa-lollipop-user-id"];
        const sourceDetails = event?.headers?.["x-pagopa-pn-io-src"];

        if (!validateSourceDetails(sourceDetails)) {
            console.error("Invalid source details header", sourceDetails);
            return defaultDenyAllPolicy;
        }

        if (!taxId) {
            console.error("Header 'x-pagopa-cx-taxid' is missing. Denying access.");
            return defaultDenyAllPolicy;
        } else if (userId && taxId.toUpperCase() !== userId.toUpperCase()) {
            console.error("Mismatch between taxId and userId.");
            return defaultDenyAllPolicy;
        } else {
            console.info("Match found between taxId and userId");
            try {
              const cxId = await getCxId(taxId);
              console.info("cxId", cxId);
              // Generate IAM Policy
              const contextMap = {
                    resultCode: commandResult.resultCode || '',
                    name: commandResult.name || '',
                    familyName: commandResult.familyName || '',
                    cxId: cxId,
                    sourceChannelDetails: sourceDetails,
              };
              iamPolicy = await generateIAMPolicy(event.methodArn, contextMap );
              console.log("IAM Policy", JSON.stringify(iamPolicy));
              return iamPolicy;
            } catch (err) {
              console.error("Error generating IAM policy with error ", err);
              return defaultDenyAllPolicy;
            }
        }

    } catch (error) {
        console.error("Lollipop Authorizer Validation - Error during authorization flow (get/generate policy): ", error.errorCode, " - Message: ", error.message);
        return defaultDenyAllPolicy;
    }
}


export { handleEvent };