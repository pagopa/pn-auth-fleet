const ErrorRetrievingIdpCertDataException = require('../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../app/exception/certDataNotFoundException');
const { CIE_ENTITY_ID } = require("./constants/lollipopConstants");

async function getCertData(entityId, instant, entityConfig) {

    let listCertData = [];
    const isMissing = !entityId ||  !instant ||
        (typeof entityId === 'string' && entityId.trim().length === 0) ||
        (typeof instant === 'string' && instant.trim().length === 0);
    if (isMissing) {
        throw new Error("EntityID or Assertion Issue Instant missing");
    }

    //(CIE vs SPID)
    try {
        if (CIE_ENTITY_ID[0].includes(entityId)) {
            listCertData = await getCieCerts(entityId, instant, listCertData);
        } else {
            listCertData = await getSpidCerts(entityId, instant, listCertData);
        }
    } catch (e) {
        if (e instanceof CertDataNotFoundException) {
            throw new ErrorRetrievingIdpCertDataException(
                ErrorRetrievingIdpCertDataException.ErrorCode.IDP_CERT_DATA_NOT_FOUND,
                'Could not retrieve certificate data from provider', e);
        }
        throw e;
    }
    return listCertData;
}