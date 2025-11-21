const ErrorRetrievingIdpCertDataException = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const idpCertClient = require('./idpCertClient');

async function getIdpCertData(instant, entityId) {

    try {
        const idpCertData = await idpCertClient.getListCertData(instant, entityId);
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

module.exports = {
    getIdpCertData,
}