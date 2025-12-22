const { validateLollipopRequest } = require("../app/lollipopRequestValidation");
//const { validateLollipopHttpSignature } = require("../app/lollipopHttpSignatureValidation");
const { validateLollipopAssertion } = require('../app/lollipopAssertionValidation');
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const LollipopHttpSignatureValidationException = require('../app/exception/lollipopHttpSignatureValidationException');
const LollipopAssertionException = require('../app/exception/LollipopAssertionException');
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


    async function validateLollipopAuthorizer(request){
        console.log("[validateLollipopAuthorizer] - starting ...");

        let commandResult = { statusCode: 500, resultCode: "INIT", resultMessage: "" };
        try {
            //STEP 1- Validazione degli header per una richiesta Lollipop.
            await validateLollipopRequest(request);

            //STEP 2 - Validazione della Http Signature
//            commandResult = await validateLollipopHttpSignature(request);
            if(commandResult.resultCode !== "HTTP_MESSAGE_VALIDATION_SUCCESS"){
                commandResult.statusCode = 402;
                console.error("Lollipop Request Http Signature Validation failed - statusCode: ", commandResult.statusCode,
                        " - resultCode: ", commandResult.resultCode, " - resultMessage: ", commandResult.resultMessage);
                return commandResult;
            }
            //STEP 3 - Validazione della assertion della request Lollipop.
            commandResult = await validateLollipopAssertion(request);

            // Se la validazione è completata con successo
            if(commandResult.resultCode === "ASSERTION_VERIFICATION_SUCCESS"){
                commandResult.statusCode = 200;
            }
            console.log("[validateLollipopAuthorizer] - ending statusCode: ", commandResult.statusCode,
                      " - resultCode: ", commandResult.resultCode, " - resultMessage: ", commandResult.resultMessage);

            return commandResult;

        } catch (error) {
            console.error("Lollipop Authorizer Validation failed:", error.name, error.message);
            // Gestione degli errori
            let statusCode = 500;
            let resultCode = "FATAL_ERROR";
            let resultMessage = '';
            if (error instanceof LollipopRequestContentValidationException) {
                // Bad Request per dati mancanti/invalidi
                statusCode = 401;
                resultCode = "REQUEST_PARAMS_VALIDATION_FAILED";
                resultMessage = `Error validating Lollipop request header or body, validation failed`
                          + ` with error code [${error.errorCode}] and message: ${error.message}`;

            }else if (error instanceof LollipopHttpSignatureValidationException) {
                statusCode = 402;
                resultCode = "HTTP_MESSAGE_VALIDATION_FAILED";
                resultMessage = `Error validating Lollipop http Signature, validation failed`
                          + ` with error code [${error.errorCode}] and message: ${error.message}`;

            }else if (error instanceof LollipopAssertionException) {
                statusCode = 403;
                resultCode = "REQUEST_ASSERTION_VALIDATION_FAILED";
                resultMessage = `Error validating Lollipop request assertion, validation failed`
                          + ` with error code [${error.errorCode}] and message: ${error.message}`;

            }else {
                resultMessage = `Error validating Lollipop request assertion, validation failed`
                          + ` with error code [${error.errorCode}] and message: ${error.message}`;
            }

            console.error("[validateLollipopAuthorizer] - ending statusCode: ", statusCode,
                       " - resultCode: ", resultCode, " - resultMessage: ", resultMessage);

            return {
                statusCode,
                resultCode,
                resultMessage: `Validation failed [${error.errorCode || 'GENERIC'}]: ${error.message}`
            };
        }
    }

module.exports = { handleEvent };
