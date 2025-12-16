const LollipopAssertionNotFoundException = require('../exception/lollipopAssertionNotFoundException');
const ErrorRetrievingAssertionException = require('../exception/errorRetrievingAssertionException');
const OidcAssertionNotSupported = require('../exception/oidcAssertionNotSupported');
const client = require('../client/assertionClient.js');
const { ASSERTION_ERROR_CODES } = require('../constants/lollipopErrorsConstants');


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


module.exports = {
    getAssertion,
    client,
    ErrorRetrievingAssertionException,
    LollipopAssertionNotFoundException,
    OidcAssertionNotSupported
};
