const { VALIDATION_ERROR_CODES, IDP_PROVIDER_CONFIG } = require('../constants/lollipopConstants');
const ErrorRetrievingIdpCertDataException = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const IdpCertClient = require('./client/idpCertClient').default;
const ApiClientClass = require('./ApiClient').default;

    
    async function getIdpCertData(instant, entityId) {

        try {
            const client = provideClient();
            const idpCertData = await client.getListCertData( entityId, instant);
            console.debug('[idpCertProvider.getIdpCertData] - IdP certificates has been found for entityId %s at instant %s: %o',
                entityId, instant, idpCertData );

            return idpCertData;
        } catch (e) {
            if (e instanceof CertDataNotFoundException) {
                throw new ErrorRetrievingIdpCertDataException(
                    ErrorRetrievingIdpCertDataException.ErrorCode.IDP_CERT_DATA_NOT_FOUND,
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