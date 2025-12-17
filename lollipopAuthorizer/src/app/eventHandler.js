const { validateLollipopRequestAssertion } = require('../app/LollipopAssertionValidation');
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
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

    //if (event.headers.authorization == "secretToken") {
        console.log("allowed");
        let commandResult;
        try {
              const request = {
                // Mapping degli header ricevuti dall'evento
                headerParams: {
                    headers: event.headers || {}
                },
              };

              commandResult = await validationRequestAssertion(request);

              // Capture taxId from event
              const taxId = event?.headers?.["x-pagopa-cx-taxid"];
              if (!taxId) {
                  console.error("Header 'x-pagopa-cx-taxid' is missing. Denying access.");
                  return defaultDenyAllPolicy;
              }
              const cxId = await getCxId(taxId);
              console.info("cxId", cxId);
                //if(commandResult
              const contextMap = {
                  name: commandResult.name,
                  familyName: commandResult.familyName,
                  cxId: cxId,
              };

              // Generate IAM Policy
              const iamPolicy = await generateIAMPolicy(event.methodArn, cxId, contextMap);
              console.log("IAM Policy", JSON.stringify(iamPolicy));
              return iamPolicy;
        } catch (error) {
            console.error("Error during authorization flow (get/generate policy): ", error);
            // Se l'errore è un "Unauthorized" lanciato precedentemente, API Gateway lo gestisce.
            // Se è un errore del server (es. getCxId fallisce), neghiamo l'accesso per sicurezza.
            if (error.message === "Unauthorized") {
                // Rilancia l'errore per far sì che API Gateway restituisca 401/403
                throw error;
            }
            // Errore interno al server (500), nega l'accesso
            return defaultDenyAllPolicy;
        }
   /* }else{
        console.log("denied");
        return defaultDenyAllPolicy;
    }*/
}


    async function validationRequestAssertion(request){

        let commandResult;
        try {
            //Validazione degli header per una richiesta Lollipop.
            await validateLollipopRequest(request);

            //Validazione della Signature
            //await validateSignatureAssertion();

            //Validazione della assertion della request Lollipop.
            commandResult = await validateLollipopRequestAssertion(request);

            // Se la validazione è completata con successo
            commandResult.statusCode = 200;
            return commandResult;
        } catch (error) {
            console.error("Lollipop Request Assertion Validation failed:", error.name, error.message);
            // Gestione degli errori
            let statusCode = 500;
            let resultMessage;
            if (error instanceof LollipopRequestContentValidationException) {
                // Bad Request per dati mancanti/invalidi
                statusCode = 401;
                resultCode = "REQUEST_PARAMS_VALIDATION_FAILED";
                resultMessage = `Error validating Lollipop request header or body, validation failed`
                          + ` with error code [${error.code}] and message: ${error.message}`;
                console.error(resultMessage);
            }else if (error instanceof LollipopAssertionException) {
                statusCode = 403;
                resultCode = "REQUEST_ASSERTION_VALIDATION_FAILED";
                resultMessage = `Error validating Lollipop request assertion, validation failed`
                          + ` with error code [${error.code}] and message: ${error.message}`;

            }else {
                statusCode = 500;
                resultCode = "FATAL_ERROR";
                resultMessage = `Error validating Lollipop request assertion, validation failed`
                          + ` with error code [${error.code}] and message: ${error.message}`;
            }
            commandResult.statusCode = statusCode;
            commandResult.resultCode = resultCode;
            commandResult.resultMessage = resultMessage;
            return commandResult;
        }
    }

module.exports = { handleEvent };
