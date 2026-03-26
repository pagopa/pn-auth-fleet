import { IDP_PROVIDER_CONFIG } from "../../config/lollipopConsumerRequestConfig.js";
import { ErrorRetrievingIdpCertDataException, ErrorCode } from "../../exception/errorRetrievingIdpCertDataException.js";
import CertDataNotFoundException from "../../exception/certDataNotFoundException.js";
import IllegalArgumentException from "../../exception/illegalArgumentException.js";
import IdpCertClient from "./client/idpCertClient.js"; //.default;
import ApiClientClass from "./ApiClient.js";


    async function getIdpCertData(instant, entityId) {
        console.log('[idpCertProvider - getIdpCertData]');
        try {
            const client = provideClient();
            const idpCertData = await client.getListCertData( entityId, instant);
            console.debug('[ - getIdpCertData] - IdP certificates has been found for entityId %s at instant %s: %o',
                entityId, instant, idpCertData );

            return idpCertData;
        } catch (e) {
            if (e instanceof CertDataNotFoundException || e instanceof IllegalArgumentException) {
                throw new ErrorRetrievingIdpCertDataException(
                    ErrorCode.IDP_CERT_DATA_NOT_FOUND,
                    "Some error occurred in retrieving certification data from IDP", e );
            }
            // Rilancia qualsiasi altro errore
            throw e;
        }
    }

 
    function provideClient(){

        let idpProviderConfigBaseUri;
        if( process.env.IDP_CONFIG_BASE_URI === undefined || process.env.IDP_CONFIG_BASE_URI === '')
            idpProviderConfigBaseUri = IDP_PROVIDER_CONFIG.BASE_URI;
        else
            idpProviderConfigBaseUri = process.env.IDP_CONFIG_BASE_URI;

        const apiClientInstance = new ApiClientClass(idpProviderConfigBaseUri);

        console.log(`[TESTUAT] IDP env IDP_CONFIG_BASE_URI: ${process.env.IDP_CONFIG_BASE_URI || '(not set)'}`);
        console.log(`[TESTUAT] IDP base URI (effective): ${idpProviderConfigBaseUri}`);

        const idpHttpTimeout = parseInt(process.env.IDP_HTTP_TIMEOUT_MS || '10000');
        apiClientInstance.timeout = idpHttpTimeout;
        console.log(`[provideClient] IDP HTTP timeout set to ${idpHttpTimeout}ms`);

        return new IdpCertClient(apiClientInstance, IDP_PROVIDER_CONFIG);
    }


export default { getIdpCertData };
