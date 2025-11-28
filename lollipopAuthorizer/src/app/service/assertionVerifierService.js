const { SAML_ASSERTION } = require("../../app/constants/lollipopConstants");
const ErrorRetrievingIdpCertDataException = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const idpCertProvider = require('../../app/idp/idpCertProvider');

    async function getIdpCertData(assertionDoc){
        console.log('[assertionVerifierService - getIdpCertData]');
        const rootElement = assertionDoc.documentElement;
        /** @type {NodeList} array */
        const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.ASSERTION);
        if( isElementNotFound(listElements, SAML_ASSERTION.ISSUE_INSTANT) ) {
            console.error('[ - getIdpCertData] Missing instant field in the retrieved saml assertion');
            throw new ErrorRetrievingIdpCertDataException(
              ErrorRetrievingIdpCertDataException.ErrorCode.INSTANT_FIELD_NOT_FOUND,
              'Missing instant field in the retrieved saml assertion'
            );
        }
        const firstAssertionElement = listElements[0];
        //IssueInstant
        const instant = firstAssertionElement.getAttribute(SAML_ASSERTION.ISSUE_INSTANT);
        //Issuer - Identity Provider ID
        const entityId = getEntityId(firstAssertionElement.childNodes, SAML_ASSERTION.ISSUER_ENTITY_ID_TAG);
        if (!entityId) {
            throw new ErrorRetrievingIdpCertDataException(
                ErrorRetrievingIdpCertDataException.ErrorCode.ENTITY_ID_FIELD_NOT_FOUND,
                "Missing entity id field in the retrieved saml assertion"
            );
        }
        try{
            const parserizedInstant = parseInstantToUnixTimestamp(instant);
            const idpCertDataList = await retrieveIdpCertData(entityId, parserizedInstant);
            return idpCertDataList;
        }catch (e) {
            console.error(e.message);
            // Rilancia qualsiasi altro errore
            throw e;
        }
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
        // Converto la NodeList in un array per iterare
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

            // idpCertData è un array
            //console.debug('[assertionVerifierService.retrieveIdpCertData] - input: entityId %s at instant %s', trimmedEntityId, instant );
            const idpCertData = await idpCertProvider.getIdpCertData(instant, trimmedEntityId);
            //console.debug('[assertionVerifierService.retrieveIdpCertData] - IdP certificates has been found for entityId %s at instant %s: %o',
            //    trimmedEntityId, instant, idpCertData );

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