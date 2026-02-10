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
    const results = await Promise.allSettled([
        validatePublicKey(headers[lollipopConfig.publicKeyHeader]),
        validateAssertionRefHeader(headers[lollipopConfig.assertionRefHeader]),
        validateAssertionTypeHeader(headers[lollipopConfig.assertionTypeHeader]),
        validateUserIdHeader(headers[lollipopConfig.userIdHeader]),
        validateAuthJWTHeader(headers[lollipopConfig.authJWTHeader]),
        validateOriginalMethodHeader(headers[lollipopConfig.originalMethodHeader]),
        validateOriginalURLHeader(headers[lollipopConfig.originalURLHeader]),
        validateSignatureInputHeader(headers[lollipopConfig.signatureInputHeader]),
        validateSignatureHeader(headers[lollipopConfig.signatureHeader]),
    ]);

    const firstError = results.find(result => result.status === 'rejected');
    if (firstError){
        throw firstError.reason;
    }

    console.log("Ending validateLollipopRequest")
}

export { validateLollipopRequest, };
