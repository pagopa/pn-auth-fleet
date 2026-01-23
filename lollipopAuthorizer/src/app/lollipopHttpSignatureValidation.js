const { verifyHttpSignature} = require("./verifyHttpSignature");
const CommandResult = require('../app/model/CommandResult');
const { lollipopConfig } = require("../app/config/lollipopConsumerRequestConfig");
const { VERIFY_HTTP_ERROR_CODES } = require("../app/constants/lollipopErrorsConstants");
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const LollipopHttpSignatureValidationException = require('../app/exception/lollipopHttpSignatureValidationException');

/**
 * Checks whether the calculated signatures of the required parameter matches with those
 * provided within the Signature param
 *
 * @async
 * @param {Object} request - Oggetto contenente gli header della richiesta
 * @return {Object} CommandResult
 * @throws {LollipopHttpSignatureValidationException} Se una delle validazioni fallisce
 */
async function validateLollipopHttpSignature(request) {

    try{
        console.log("Starting validateLollipopHttpSignature ...");
        const headers = request.headerParams.headers || request.headerParams;
        const signatureInput = headers[lollipopConfig.signatureInputHeader];
        const signature = headers[lollipopConfig.signatureHeader];

        const isValid = await verifyHttpSignature(signature, signatureInput, headers);
        if (!isValid) {
            const result = new CommandResult();
            result.resultCode = "HTTP_MESSAGE_VALIDATION_FAILED";
            result.resultMessage = "Validation of HTTP message failed, authentication failed";
            return result;

        }
        const result = new CommandResult();
        result.resultCode = "HTTP_MESSAGE_VALIDATION_SUCCESS";
        result.resultMessage = "HTTP message validated successfully";
        console.log("Ending validateLollipopHttpSignature");
        return result;
    }catch(error){
        console.error("Lollipop Request Http Signature Validation failed: ", error.name, " - Message: ", error.message);
        if (error instanceof LollipopRequestContentValidationException) {
            throw new LollipopHttpSignatureValidationException(error);
        }

        // Mapping dell'errore generico
        throw new LollipopHttpSignatureValidationException(
            error.code || VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
            error.message
        );
    }
}

module.exports = {
    validateLollipopHttpSignature,
};
