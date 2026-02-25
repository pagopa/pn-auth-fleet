import DefaultApi from '../openapiImpl/getAssertion/api/DefaultApi.js';
import ApiClient from '../openapiImpl/getAssertion/ApiClient.js';
import LollipopAssertionNotFoundException from '../exception/lollipopAssertionNotFoundException.js';
import OidcAssertionNotSupported from '../exception/oidcAssertionNotSupported.js';
import { ASSERTION_ERROR_CODES } from '../constants/lollipopErrorsConstants.js';
import { ASSERTION_PROVIDER_CONFIG } from '../config/lollipopConsumerRequestConfig.js';


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

    const api = provideApi();
    let lcUserInfo;
    try {
        lcUserInfo = await new Promise((resolve, reject) => {
            api.getAssertion(assertionRef, `Bearer ${jwt}`, (error, data, response) => {
                if (error) { reject(error); }
                else { resolve(data); }
            });
        });
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


/**
 * Crea e configura l'istanza DefaultApi con basePath e subscriptionKey.
 * Pattern analogo a idpCertProvider.js:provideClient()
 *
 * @returns {DefaultApi}
 */
function provideApi() {
    let assertionBaseUri;
    if (process.env.ASSERTION_REST_URI === undefined || process.env.ASSERTION_REST_URI === '')
        assertionBaseUri = ASSERTION_PROVIDER_CONFIG.BASE_URI;
    else
        assertionBaseUri = process.env.ASSERTION_REST_URI;

    let subscriptionKey;
    if (process.env.ASSERTION_SUBSCRIPTION_KEY === undefined || process.env.ASSERTION_SUBSCRIPTION_KEY === '')
        subscriptionKey = ASSERTION_PROVIDER_CONFIG.SUBSCRIPTION_KEY;
    else
        subscriptionKey = process.env.ASSERTION_SUBSCRIPTION_KEY;

    const apiClientInstance = new ApiClient(assertionBaseUri);

    if (subscriptionKey) {
        apiClientInstance.authentications['ApiKeyAuth'].apiKey = subscriptionKey;
    }

    return new DefaultApi(apiClientInstance);
}

export default { getAssertionFromClient };