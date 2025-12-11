const {IDP_PROVIDER_CONFIG} = require('../config/lollipopConsumerRequestConfig');
const {ErrorRetrievingIdpCertDataException, ErrorCode} = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const IllegalArgumentException = require('../../app/exception/illegalArgumentException');
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
        const apiClientInstance = new ApiClientClass(IDP_PROVIDER_CONFIG.BASE_URI);
        //apiClient.basePath = IDP_PROVIDER_CONFIG.BASE_URI;
        return new IdpCertClient(apiClientInstance, IDP_PROVIDER_CONFIG);
    }


module.exports = {
    getIdpCertData,
}
