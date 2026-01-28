import { lollipopConfig } from "../../app/config/lollipopConsumerRequestConfig.js";
import { ErrorRetrievingIdpCertDataException } from "../../app/exception/errorRetrievingIdpCertDataException.js";
import CertDataNotFoundException from "../../app/exception/certDataNotFoundException.js";
import idpCertProvider from "../openapiImpl/idp/idpCertProvider.js";

/**
 * Recupera i dati del certificato dell'Identity Provider (IDP)
 * a partire da un assertionDoc
 *
 * @async
 * @param {Document} assertionDoc - Documento XML SAML già parsato
 * @returns {Promise<Array>} Lista dei dati del certificato IDP
 * @throws {ErrorRetrievingIdpCertDataException} Se mancano campi obbligatori o se il recupero dei dati fallisce.
 */
    async function getIdpCertData(assertionDoc){
        console.log('[assertionVerifierService - getIdpCertData]');
        const rootElement = assertionDoc.documentElement;
        /** @type {NodeList} array */
        const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionTag);
        if( isElementNotFound(listElements, lollipopConfig.ISSUE_INSTANT) ) {
            console.error('[ - getIdpCertData] Missing instant field in the retrieved saml assertion');
            throw new ErrorRetrievingIdpCertDataException(
              ErrorRetrievingIdpCertDataException.ErrorCode.INSTANT_FIELD_NOT_FOUND,
              'Missing instant field in the retrieved saml assertion'
            );
        }
        const firstAssertionElement = listElements[0];
        //IssueInstant
        const instant = firstAssertionElement.getAttribute(lollipopConfig.ISSUE_INSTANT);
        //Issuer - Identity Provider ID
        const entityId = getEntityId(firstAssertionElement.childNodes, lollipopConfig.ISSUER_ENTITY_ID_TAG);
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

/**
 * Verifica se un attributo obbligatorio non è presente
 * nel primo elemento di una NodeList
 *
 * @param {NodeListOf<Element>} listElements - Lista di elementi da verificare
 * @param {string} elementName - Nome dell'attributo da verificare
 * @returns {boolean} true se l'elemento o l'attributo è mancante
 */
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

/**
 * Estrae l'entityId (Issuer) dai nodi dell'assertion
 *
 * @param {NodeList} childNodeList - Lista dei nodi dell'elemento <Assertion>
 * @param {string} entityIdTag - Nome del tag (localName) che identifica l'issuer
 * @returns {string|null} entityID se trovato, altrimenti null
 */
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

/**
 * Converte una data in un timestamp Unix (in secondi)
 *
 * Se la data non è parsabile, viene restituito il valore originale
 *
 * @param {string} instant - stringa data/ora ISO (es. 2024-01-01T12:00:00Z)
 * @returns {string} Timestamp Unix in secondi o valore originale se non parsabile
 */
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

/**
 * Recupera i dati del certificato IDP utilizzando entityId e instant
 *
 * @async
 * @param {string} entityId - Identificativo dell'Identity Provider
 * @param {string} instant - Timestamp Unix (in secondi) o data originale
 * @returns {Promise<Array>} Lista dei dati del certificato IDP
 * @throws {ErrorRetrievingIdpCertDataException} se i dati del certificato non vengono trovati
 */
    async function retrieveIdpCertData(entityId, instant) {
        let trimmedEntityId = entityId;
        try {
            if (typeof entityId === 'string') {
                trimmedEntityId = entityId.trim();
            }

            // idpCertData è un array
            const idpCertData = await idpCertProvider.getIdpCertData(instant, trimmedEntityId);

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


export { getIdpCertData,
    parseInstantToUnixTimestamp, }