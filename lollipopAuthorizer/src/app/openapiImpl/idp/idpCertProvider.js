const {IDP_PROVIDER_CONFIG} = require('../../config/lollipopConsumerRequestConfig');
const {ErrorRetrievingIdpCertDataException, ErrorCode} = require('../../exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../exception/certDataNotFoundException');
const IllegalArgumentException = require('../../exception/illegalArgumentException');
const IdpCertClient = require('./client/idpCertClient'); //.default;
const ApiClientClass = require('./ApiClient');


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
        //apiClient.basePath = IDP_PROVIDER_CONFIG.BASE_URI;
        return new IdpCertClient(apiClientInstance, IDP_PROVIDER_CONFIG);
    }


module.exports = {
    getIdpCertData,
}
