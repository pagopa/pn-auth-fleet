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

    console.log('[TESTUAT][assertionClient.getAssertionFromClient] === INPUT PARAMS ===');
    console.log('[TESTUAT][assertionClient.getAssertionFromClient] assertionRef:', assertionRef);
    console.log('[TESTUAT][assertionClient.getAssertionFromClient] jwt present:', !!jwt, '| length:', jwt?.length ?? 0);
    console.log('[TESTUAT][assertionClient.getAssertionFromClient] jwt prefix (50 chars):', jwt ? jwt.substring(0, 50) : 'MISSING');
    console.log('[TESTUAT][assertionClient.getAssertionFromClient] ====================');

    const api = provideApi();
    console.info("[TESTUAT] Api created: " , api !== null )
    console.info("[TESTUAT] Api details :" ,JSON.stringify(api))
    let lcUserInfo;
    try {
        lcUserInfo = await new Promise((resolve, reject) => {
            api.getAssertion(assertionRef, `Bearer ${jwt}`, (error, data, response) => {
                console.log('[TESTUAT][assertionClient.getAssertionFromClient] === HTTP RESPONSE ===');
                console.log('[TESTUAT][assertionClient.getAssertionFromClient] response status:', response?.status);
                console.log('[TESTUAT][assertionClient.getAssertionFromClient] response headers:', JSON.stringify(response?.headers));
                console.log('[TESTUAT][assertionClient.getAssertionFromClient] response body:', JSON.stringify(response?.body));
                console.log('[TESTUAT][assertionClient.getAssertionFromClient] response text:', response?.text);
                if (error) {
                    console.log('[TESTUAT][assertionClient.getAssertionFromClient] error:', error?.message ?? error);
                    console.log('[TESTUAT][assertionClient.getAssertionFromClient] error status:', error?.status);
                    console.log('[TESTUAT][assertionClient.getAssertionFromClient] error response body:', JSON.stringify(error?.response?.body));
                    console.log('[TESTUAT][assertionClient.getAssertionFromClient] error response text:', error?.response?.text);
                    reject(error); }
                else {
                    console.log('[TESTUAT][assertionClient.getAssertionFromClient] data actualInstance keys:', data?.actualInstance ? Object.keys(data.actualInstance) : 'null');
                    resolve(data); }
            });
        });
        console.info("[TESTUAT] lcuserinfo: ",lcUserInfo)
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

    const assertionHttpTimeout = parseInt(process.env.ASSERTION_HTTP_TIMEOUT_MS || '10000');
    apiClientInstance.timeout = assertionHttpTimeout;
    console.info("[TESTUAT] subscriptionKey: ",subscriptionKey)
    if (subscriptionKey) {
        apiClientInstance.authentications['ApiKeyAuth'].apiKey = subscriptionKey;
        apiClientInstance.defaultHeaders['Ocp-Apim-Subscription-Key'] = subscriptionKey;

    }
    console.log('[TESTUAT][assertionClient.provideApi] === API CLIENT CONFIG ===');
    console.log('[TESTUAT][assertionClient.provideApi] env ASSERTION_REST_URI:', process.env.ASSERTION_REST_URI ?? '(not set)');
    console.log('[TESTUAT][assertionClient.provideApi] assertionBaseUri (effective):', assertionBaseUri);
    console.log('[TESTUAT][assertionClient.provideApi] env ASSERTION_SUBSCRIPTION_KEY present:', !!(process.env.ASSERTION_SUBSCRIPTION_KEY));
    console.log('[TESTUAT][assertionClient.provideApi] subscriptionKey source:', process.env.ASSERTION_SUBSCRIPTION_KEY ? 'env' : 'config default');
    console.log('[TESTUAT][assertionClient.provideApi] subscriptionKey present:', !!subscriptionKey, '| length:', subscriptionKey?.length ?? 0);
    console.log('[TESTUAT][assertionClient.provideApi] env ASSERTION_HTTP_TIMEOUT_MS:', process.env.ASSERTION_HTTP_TIMEOUT_MS ?? '(not set)');
    console.log('[TESTUAT][assertionClient.provideApi] timeout (effective ms):', assertionHttpTimeout);
    console.log('[TESTUAT][assertionClient.provideApi] ========================');


    return new DefaultApi(apiClientInstance);
}

export default { getAssertionFromClient };