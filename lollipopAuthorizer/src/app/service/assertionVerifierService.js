const xmldom = require('xmldom');
const { SAML_ASSERTION } = require("../../app/constants/lollipopConstants");
const ErrorRetrievingIdpCertDataException = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const idpCertProvider = require('./idpCertProvider');

async function getIdpCertData(assertionDoc){

    const rootElement = assertionDoc.documentElement;
    /** @type {NodeList} array */
    const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.ASSERTION);
    if( isElementNotFound(listElements, SAML_ASSERTION.ISSUE_INSTANT) ) {
        console.error('[getIdpCertData] Missing instant field in the retrieved saml assertion');
        throw new ErrorRetrievingIdpCertDataException(
          ErrorRetrievingIdpCertDataException.ErrorCode.INSTANT_FIELD_NOT_FOUND,
          'Missing instant field in the retrieved saml assertion'
        );
    }
    const firstAssertionElement = listElements[0];
    const instant = firstAssertionElement.getAttribute(SAML_ASSERTION.ISSUE_INSTANT);
/*    if( isElementNotFound(listElements, SAML_ASSERTION.NOT_BEFORE) ) {
        console.error('[validateAssertionPeriod] The notBefore parameter is not valid or an error occurred during parsing');
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE,
            'The notBefore parameter is not valid or an error occurred during parsing'
        );
    }
    */
    const entityId = getEntityId(firstAssertionElement.childNodes, SAML_ASSERTION.ISSUER_ENTITY_ID_TAG);
    if (!entityId) {
        throw new ErrorRetrievingIdpCertDataException(
            ErrorRetrievingIdpCertDataException.ErrorCode.ENTITY_ID_FIELD_NOT_FOUND,
            "Missing entity id field in the retrieved saml assertion"
        );
    }

    const parserizedInstant = parseInstantToUnixTimestamp(instant);

    //TODO idpCertProvider ??
    const idpCertData = await retrieveIdpCertData(entityId, parserizedInstant);
    return idpCertData;
}

function isElementNotFound(listElements, elementName) {
    if (!listElements || listElements.length === 0) {
        return true;
    }
    const firstElement = listElements[0];
    if (!firstElement) {
        return true;
    }
    const attributeValue = firstElement.getAttribute(elementName);
    if (!attributeValue) {
        return true;
    }
    return false;
}


function getEntityId(childNodeList, entityIdTag) {
    if (!childNodeList) {
        return null;
    }
    // Converitamo la NodeList in un array per iterare
    const elementsArray = Array.from(childNodeList);
    for (const item of elementsArray) {
        if ( item && item.localName && item.localName === entityIdTag ){
            const textContent = item.textContent;
            if (textContent) {
                return textContent;
            }
        }
    }
    return null;
}

function parseInstantToUnixTimestamp(instant) {
    let unixTimestampSeconds = instant;
    const milliseconds = Date.parse(instant);
    if (isNaN(milliseconds)) {
        const msg = 'Retrieved instant ${instant} does not match expected ISO datetime format';
        console.debug(msg);
        return instant;
    }
    const seconds = Math.floor(milliseconds / 1000);
    unixTimestampSeconds = String(seconds);
    return unixTimestampSeconds;
}


async function retrieveIdpCertData(entityId, instant) {
    let trimmedEntityId = entityId;
    try {
        if (typeof entityId === 'string') {
            trimmedEntityId = entityId.trim();
        }
        const idpCertData = await idpCertProvider.getIdpCertData(instant, trimmedEntityId);
        console.debug('IdP certificates has been found for entityId %s at instant %s: %o',
            trimmedEntityId, instant, idpCertData );

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