import { validatePublicKey,
    validateAssertionRefHeader,
    validateAssertionTypeHeader,
    validateUserIdHeader,
    validateOriginalMethodHeader,
    validateOriginalURLHeader,
    validateSignatureInputHeader,
    validateSignatureHeader,
    validateAuthJWTHeader
 } from "./requestValidation.js";

import { lollipopConfig  } from "../app/config/lollipopConsumerRequestConfig.js";

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
    await Promise.all([
        validatePublicKey(headers[lollipopConfig.publicKeyHeader]),
        validateAssertionRefHeader(headers[lollipopConfig.assertionRefHeader]),
        Promise.resolve(validateAssertionTypeHeader(headers[lollipopConfig.assertionTypeHeader])),
        validateUserIdHeader(headers[lollipopConfig.userIdHeader]),
        Promise.resolve(validateAuthJWTHeader(headers[lollipopConfig.authJWTHeader])),
        validateOriginalMethodHeader(headers[lollipopConfig.originalMethodHeader]),
        validateOriginalURLHeader(headers[lollipopConfig.originalURLHeader]),
        validateSignatureInputHeader(headers[lollipopConfig.signatureInputHeader]),
        validateSignatureHeader(headers[lollipopConfig.signatureHeader]),
    ]);

    console.log("Ending validateLollipopRequest")
}

export { validateLollipopRequest, };
