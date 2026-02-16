import DefaultApi from '../openapiImpl/getAssertion/api/DefaultApi.js';
import AssertionRef from '../openapiImpl/getAssertion/model/AssertionRef.js';
import LollipopAssertionNotFoundException from '../exception/lollipopAssertionNotFoundException.js';
import ErrorRetrievingAssertionException from '../exception/errorRetrievingAssertionException.js';
import OidcAssertionNotSupported from '../exception/oidcAssertionNotSupported.js';
import { ASSERTION_ERROR_CODES } from '../constants/lollipopErrorsConstants.js';


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

export default { getAssertionFromClient };
