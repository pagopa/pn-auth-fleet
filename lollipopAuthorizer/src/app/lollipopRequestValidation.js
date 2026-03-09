import {
    validatePublicKey,
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

    const originalURL = headers[lollipopConfig.originalURLHeader];

    const results = await Promise.allSettled([
        (async () => validatePublicKey(headers[lollipopConfig.publicKeyHeader]))(),
        (async () => validateAssertionRefHeader(headers[lollipopConfig.assertionRefHeader]))(),
        (async () => validateAssertionTypeHeader(headers[lollipopConfig.assertionTypeHeader]))(),
        (async () => validateUserIdHeader(headers[lollipopConfig.userIdHeader]))(),
        (async () => validateAuthJWTHeader(headers[lollipopConfig.authJWTHeader]))(),
        (async () => validateOriginalMethodHeader(
            request.path,
            headers[lollipopConfig.originalMethodHeader],
            originalURL
        ))(),
        (async () => validateOriginalURLHeader(request.path, originalURL))(),
        (async () => validateSignatureInputHeader(headers[lollipopConfig.signatureInputHeader]))(),
        (async () => validateSignatureHeader(headers[lollipopConfig.signatureHeader]))(),
    ]);

    const firstError = results.find(result => result.status === 'rejected');
    if (firstError){
        throw firstError.reason;
    }

    console.log("Ending validateLollipopRequest")
}

export { validateLollipopRequest, };
