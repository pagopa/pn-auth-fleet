import LollipopAssertionNotFoundException from "../exception/lollipopAssertionNotFoundException.js";
import ErrorRetrievingAssertionException from "../exception/errorRetrievingAssertionException.js";
import OidcAssertionNotSupported from "../exception/oidcAssertionNotSupported.js";
import client from "../client/assertionClient.js";
import { ASSERTION_ERROR_CODES  } from "../constants/lollipopErrorsConstants.js";


/**
 * Chiama il client per ottenere la SAML Assertion e restituisce un documento XML
 * @param {string} jwt 
 * @param {string} assertionRef 
 * @returns {Document} assertionDoc
 */
async function getAssertion(jwt, assertionRef) {
    try {
        const assertion = await client.getAssertionFromClient(jwt, assertionRef);

        if (!assertion) {
            throw new LollipopAssertionNotFoundException(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND, "Assertion not found");
        }

        return assertion;

    } catch (e) {
        if (e instanceof OidcAssertionNotSupported) throw e;
        if (e instanceof LollipopAssertionNotFoundException) throw e;
        throw new Error(`Unexpected error: ${e.message}`);
    }
}


export { getAssertion };
