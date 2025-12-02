const {
    validatePublicKey,
    validateAssertionRefHeader,
    validateAssertionTypeHeader,
    validateUserIdHeader,
    validateOriginalMethodHeader,
    validateOriginalURLHeader,
    validateSignatureInputHeader,
    validateSignatureHeader,
    validateAuthJWTHeader
} = require("./requestValidation");

const { lollipopConfig } = require("../app/config/lollipopConsumerRequestConfig");

/**
 * Valida tutti gli header necessari per una richiesta Lollipop.
 *
 * @async
 * @param {Object} request - Oggetto contenente gli header della richiesta
 * @param {Object} request.headerParams.headers - La mappa key/value degli header
 *
 * @throws {LollipopRequestContentValidationException} Se una delle validazioni fallisce
 */
async function validateLollipopRequest(request) {
    console.log("Starting validateLollipopRequest...")
    const headers = request.headerParams.headers || request.headerParams;
    await validatePublicKey(headers[lollipopConfig.publicKeyHeader]);
    await validateAssertionRefHeader(headers[lollipopConfig.assertionRefHeader]);
    validateAssertionTypeHeader(headers[lollipopConfig.assertionTypeHeader]);
    await validateUserIdHeader(headers[lollipopConfig.userIdHeader]);
    validateAuthJWTHeader(headers[lollipopConfig.authJWTHeader]);
    await validateOriginalMethodHeader(headers[lollipopConfig.originalMethodHeader]);
    await validateOriginalURLHeader(headers[lollipopConfig.originalURLHeader]);
    await validateSignatureInputHeader(headers[lollipopConfig.signatureInputHeader]);
    await validateSignatureHeader(headers[lollipopConfig.signatureHeader]);
    console.log("Ending validateLollipopRequest")
}

module.exports = {
    validateLollipopRequest,
};
