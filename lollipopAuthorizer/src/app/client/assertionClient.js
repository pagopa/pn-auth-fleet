const DefaultApi = require('../openapiImpl/getAssertion/api/DefaultApi');
const AssertionRef = require('../openapiImpl/getAssertion/model/AssertionRef');
const LollipopAssertionNotFoundException  = require('../exception/lollipopAssertionNotFoundException');
const ErrorRetrievingAssertionException  = require('../exception/errorRetrievingAssertionException');
const OidcAssertionNotSupported  = require('../exception/oidcAssertionNotSupported');
const { ASSERTION_ERROR_CODES } = require('../constants/lollipopErrorsConstants');


/**
 * Chiama il client per ottenere la SAML Assertion e restituisce un documento XML
 * @param {string} jwt 
 * @param {string} assertionRef 
 * @returns {Document} assertionDoc
 */
async function getAssertionFromClient(jwt, assertionRef) {
    if (!jwt || !assertionRef) {
        throw new Error(`Cannot retrieve the assertion, jwt [${jwt}] or assertionRef [${assertionRef}] missing`);
    }

    const api = new DefaultApi();
    let lcUserInfo;
    try {
        lcUserInfo = await api.getAssertion(assertionRef, `Bearer ${jwt}`);
    } catch (err) {
        throw new LollipopAssertionNotFoundException( ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND,
            `Error retrieving assertion: ${err.message}`
        );
    }

    //const actual = lcUserInfo.actualInstance;

    // SAML
    if (lcUserInfo.actualInstance?.response_xml) {
        return {
            assertionRef,
            assertionData: lcUserInfo.actualInstance.response_xml
        };
    }
    // OIDC
    if (lcUserInfo.actualInstance?.id_token) {
        throw new OidcAssertionNotSupported(ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED, "OIDC Claims not supported yet.");
    }
    return null;
}

module.exports = {
    getAssertionFromClient,
    ErrorRetrievingAssertionException,
    LollipopAssertionNotFoundException,
    OidcAssertionNotSupported
};
