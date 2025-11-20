const ErrorRetrievingIdpCertDataException = require('../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../app/exception/certDataNotFoundException');


async function getIdpCertData(instant, entityId) {

    try {
        const idpCertData = await idpCertClient.getIdpCertData(instant, entityId);
        console.debug('IdP certificates has been found for entityId %s at instant %s: %o',
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