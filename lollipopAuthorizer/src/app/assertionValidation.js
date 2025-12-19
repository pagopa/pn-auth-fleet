const crypto = require('crypto');
const { MILLISECONDS_PER_DAY, AssertionRefAlgorithms } = require('../app/constants/lollipopConstants');
const {lollipopConfig} = require('../app/config/lollipopConsumerRequestConfig')
const LollipopAssertionException = require('./exception/lollipopAssertionException');
const { validateSignature } = require('./signatureValidation');
const { DOMParser } = require('xmldom');
const ErrorRetrievingAssertionException = require('./exception/errorRetrievingAssertionException');
const OidcAssertionNotSupported = require('./exception/oidcAssertionNotSupported');
const LollipopAssertionNotFoundException = require('./exception/lollipopAssertionNotFoundException');
const { getAssertion } = require('./service/assertionService');
const { getIdpCertData } = require('./service/assertionVerifierService');
const { VALIDATION_ERROR_CODES, ASSERTION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');

/**
 * Recupera e costruisce il documento dell'asserzione SAML
 *
 * @async
 * @param {string} jwt - JWT utilizzato per il recupero dell’asserzione
 * @param {string} assertionRef - Riferimento dell’asserzione
 * @returns {Promise<Document>} Documento XML dell’asserzione SAML
 * @throws {ErrorRetrievingAssertionException} in caso di errore nel recupero o parsing
 */
async function getAssertionDoc(jwt, assertionRef) {
    let assertion;
    try {
        assertion = await getAssertion(jwt, assertionRef);
    } catch (e) {
        if (e instanceof OidcAssertionNotSupported) {
            throw new ErrorRetrievingAssertionException(ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED, e.message);
        }
        if (e instanceof LollipopAssertionNotFoundException) {
            throw new ErrorRetrievingAssertionException(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND, e.message);
        }
        throw e;
    }

    return buildDocumentFromAssertion(assertion);
}

/**
 * Valida la firma digitale dell’asserzione SAML
 *
 * @async
 * @param {Document} assertionDoc - Documento XML dell'assertion
 * @param {Array} idpCertDataList - Lista dei certificati dell’Identity Provider
 * @throws {LollipopAssertionException} in caso di errore di validazione
 */
async function validateSignatureAssertion(assertionDoc, idpCertDataList) {
    let isValid;
    try {
        isValid = await validateSignature(assertionDoc, idpCertDataList);
    } catch (e) {
        console.error('[validateSignatureAssertion] Error: ', e.errorCode, ' - Message: ', e.message);
        throw new LollipopAssertionException(e);
    }
}

/**
 * Valida il periodo di validità dell’assertion (notBefore e notAfter)
 *
 * @param {Document} assertionDoc - Documento XML dell'assertion
 * @returns {boolean} true se l’asserzione è valida temporalmente
 * @throws {LollipopAssertionException} In caso di errore di parsing o date non valide
 */
 function validateAssertionPeriod(assertionDoc){

    const rootElementName = assertionDoc.documentElement.localName;
    const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionNotBeforeTag);
    if( isElementNotFound(listElements, lollipopConfig.notBeforeAttribute) ) {
        console.error('[validateAssertionPeriod] The notBefore parameter is not valid or an error occurred during parsing');
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE,
            'The notBefore parameter is not valid or an error occurred during parsing'
        );
    }
    const firstConditionsElement = listElements[0];
    const notBefore = firstConditionsElement.getAttribute(lollipopConfig.notBeforeAttribute);
    console.debug("notBefore: ", notBefore);
    //notBefore deve essere nel formato 2025-11-04T11:50:33.570Z
    const notBeforeMilliseconds = Date.parse(notBefore);
    console.debug("notBeforeMilliseconds: ", notBeforeMilliseconds);
    if( isNaN(notBeforeMilliseconds)) {
         console.error('[validateAssertionPeriod] The notBefore parameter is not valid or an error occurred during parsing');
         throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE,
           'The notBefore parameter is not valid or an error occurred during parsing'
         );
    }

    const dateNowMilliseconds = new Date().getTime();
    const expiresAfterMilliseconds = lollipopConfig.assertionExpireInDays * MILLISECONDS_PER_DAY;
    const dateNowLessNotBefore = (dateNowMilliseconds - notBeforeMilliseconds);
    if (isNaN(dateNowLessNotBefore) || isNaN(expiresAfterMilliseconds)) {
        console.error('[validateAssertionPeriod] the parameter dateNowLessNotBefore or the parameter expiresAfterMilliseconds is invalid or there is a parsing error');
        throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_DATE,
           'The parameter dateNowLessNotBefore or the parameter expiresAfterMilliseconds is invalid or there is a parsing error'
        );
    }

    //Verifichiamo la condizione: dateNowLessNotBefore && (dateNowLessNotBefore <= expiresAfterMilliseconds)
    const isNotBeforeValid = (dateNowLessNotBefore >= 0);
    const isNotExpired = (dateNowLessNotBefore <= expiresAfterMilliseconds);
    return (isNotBeforeValid && isNotExpired);
 }

 /**
 * Verifica se un attributo obbligatorio è mancante nel primo elemento di una nodeList
 *
 * @param {NodeListOf<Element>} listElements - Lista di elementi da verificare
 * @param {string} elementName - Nome dell’attributo da verificare
 * @returns {boolean} true se l’elemento o l’attributo non è presente
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
 * Valida il codice fiscale dell’utente confrontando header e assertion
 *
 * @param {Object} request - Oggetto request con gli header
 * @param {Document} assertionDoc - Documento XML dell'assertion
 * @returns {boolean} true se il codice fiscale coincide
 * @throws {LollipopAssertionException} se il codice fiscale non è presente
 */
 function validateUserId(request, assertionDoc) {
    console.log("Starting validating userId fiscal number...")
  const userIdHeader =
    request.headerParams[lollipopConfig.userIdHeader];

  const userIdFromAssertion = getUserIdFromAssertion(assertionDoc);

  if (!userIdFromAssertion) {
    console.error('[validateUserId] Missing or invalid Fiscal Code in the retrieved saml assertion');
    throw new LollipopAssertionException(
      VALIDATION_ERROR_CODES.MISSING_USER_ID,
      "Missing or invalid Fiscal Code in the retrieved saml assertion"
    );
  }

  console.log("Ending validation userId fiscal number");
  return userIdFromAssertion === userIdHeader;
}

/**
 * Estrae il codice fiscale dell’utente dall’assertion
 *
 * @param {Document} assertionDoc - Documento XML dell'assertion
 * @returns {string|null} Codice fiscale se presente, altrimenti null
 * @throws {LollipopAssertionException} se gli attributi non sono presenti
 */
function getUserIdFromAssertion(assertionDoc) {
    console.log("Starting retrieving userId fiscal number from assertion...")
  const listElements = assertionDoc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionAttributeTag
  );

  if (!listElements || listElements.length === 0) {
    console.error('[validateUserId] No elements found in the retrieved saml assertion');
    throw new LollipopAssertionException(
        VALIDATION_ERROR_CODES.MISSING_USER_ID,
      "No elements found in the retrieved saml assertion"
    );
  }
  for (let i = 0; i < listElements.length; i++) {
    const item = listElements.item(i);
    if (!item || !item.attributes) continue;

    const nameAttr = item.getAttribute("Name");

    if (nameAttr === "fiscalNumber" && item.textContent) {
          console.log("UserId fiscal number detached");
      return item.textContent.trim().replace("TINIT-", "");
    }
  }

  return null;
}

/**
 * Valida il campo InResponseTo confrontandolo con l’header
 *
 * @async
 * @param {Object} request - Oggetto request con header
 * @param {Document} assertionDoc - Documento XML 
 * @returns {Promise<boolean>} true se InResponseTo è valido
 * @throws {LollipopAssertionException} In caso di valori mancanti o invalidi
 */
 async function validateInResponseTo(request, assertionDoc){

    console.log("Starting validateInResponseTo...")
    const rootElementName = assertionDoc.documentElement.localName;
    const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionInResponseToTag);

    if( isElementNotFound(listElements, lollipopConfig.inResponseToAttribute) ) {
        console.error('[validateInResponseTo] Missing request id in the retrieved saml assertion');
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.IN_RESPONSE_TO_FIELD_NOT_FOUND,
            'Missing request id in the retrieved saml assertion'
        );
    }
    const firstConditionsElement = listElements[0];
    const inResponseTo = firstConditionsElement.getAttribute(lollipopConfig.inResponseToAttribute);
    const hashAlgorithm = retrieveInResponseToAlgorithm(inResponseTo);

    //dalla request prendo la publicKey
    const headers = request.headerParams.headers || request.headerParams;
    const publicKeyBase64Url = headers[lollipopConfig.publicKeyHeader];
    const assertionRefHeader = headers[lollipopConfig.assertionRefHeader];
    const calculatedThumbprint = await computeThumbprintWithCrypto(hashAlgorithm, publicKeyBase64Url);

    return (inResponseTo === calculatedThumbprint && inResponseTo === assertionRefHeader);
}


/**
 * Determina l’algoritmo di hash utilizzato in InResponseTo
 *
 * @param {string} inResponseTo - Valore InResponseTo 
 * @returns {string} Algoritmo di hash
 * @throws {LollipopAssertionException} Se l’algoritmo non è valido
 */
function retrieveInResponseToAlgorithm(inResponseTo) {
    if (!inResponseTo || typeof inResponseTo !== 'string') {
        console.error("[validateInResponseTo] InResponseTo value is missing or not a string");
        throw new LollipopAssertionException(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_EMPTY_OR_INVALID,
            "InResponseTo value is missing or not a string");
    }

    const algorithms = [
        AssertionRefAlgorithms.SHA256,
        AssertionRefAlgorithms.SHA384,
        AssertionRefAlgorithms.SHA512
    ];

    for (const algo of algorithms) {
        if (algo.pattern.test(inResponseTo)) {
            // Se il pattern RegExp corrisponde, restituisce l'algoritmo di hash
            return algo.hashAlgorithm;
        }
    }

    // Se nessun pattern corrisponde, lancia l'eccezione come nel codice Java
    console.error("[validateInResponseTo] InResponseTo in the assertion do not contains a valid Assertion Ref or it contains an invalid algorithm.");
    throw new LollipopAssertionException(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_ALGORITHM_NOT_VALID,
        "InResponseTo in the assertion do not contains a valid Assertion Ref or it contains an invalid algorithm."
    );
}

/**
 * Calcola il thumbprint della chiave pubblica utilizzando la libreria crypto
 *
 * @async
 * @param {string} inResponseToAlgorithm - Algoritmo di hash
 * @param {string} publicKeyBase64Url - JWK codificata Base64 URL-safe
 * @returns {Promise<string>} Thumbprint calcolato con prefisso algoritmo
 * @throws {LollipopAssertionException} Se il tipo di chiave non è supportato
 */
async function computeThumbprintWithCrypto(inResponseToAlgorithm, publicKeyBase64Url) {

    //Decodifica la JWK da Base64 URL-safe a JSON stringa
    const jwkJsonString = Buffer.from(publicKeyBase64Url, 'base64url').toString('utf8');
    const jwkObject = JSON.parse(jwkJsonString);

    //Normalizzazione dell'algoritmo
    // Rimuove caratteri non alfanumerici e converte in minuscolo per l'uso nel prefisso.
    // Esempi: "SHA-256" -> "sha256", "SHA_512" -> "sha512"
    const hashAlgorithmPrefix = inResponseToAlgorithm.toLowerCase().replace(/[^a-z0-9]/g, '');

    // L'algoritmo effettivo per crypto.createHash deve essere nel formato corretto, es. "sha256"
    // crypto accetta nomi comuni come 'sha256', 'sha384', 'sha512'.
    const cryptoHashAlgorithm = hashAlgorithmPrefix.toUpperCase().replace('SHA', 'sha'); // Normalizza per crypto

    // Normalizzazione della JWK (RFC 7638 Sezione 3.2)
    // - Crea un oggetto JSON che contiene solo i membri richiesti per il thumbprint (kty, n, e, etc.).
    // - I membri devono essere ordinati lessicograficamente per nome.
    let membersToThumbprint;

    // Seleziona e ordina i membri essenziali in base al 'kty' (Key Type)
    // Questo è cruciale per la RFC 7638.
    switch (jwkObject.kty) {
        case 'RSA':
            membersToThumbprint = {
                e: jwkObject.e,
                kty: jwkObject.kty,
                n: jwkObject.n,
            };
            break;
        case 'EC': // Elliptic Curve
            membersToThumbprint = {
                crv: jwkObject.crv,
                kty: jwkObject.kty,
                x: jwkObject.x,
                y: jwkObject.y,
            };
            break;
        case 'OKP': // Octet Key Pair (es. Ed25519)
            membersToThumbprint = {
                crv: jwkObject.crv,
                kty: jwkObject.kty,
                x: jwkObject.x,
            };
            break;
        default:
            // Gestione di kty non supportati o sconosciuti
            console.error(`Tipo di chiave (kty) non supportato per il thumbprint: ${jwkObject.kty}`);
            throw new LollipopAssertionException(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY,
                    `Tipo di chiave (kty) non supportato per il thumbprint: ${jwkObject.kty}`
                );
    }

    // Serializza il JSON normalizzato in formato "Canonical"
    // JSON.stringify() garantisce l'ordinamento in base ai membri selezionati sopra
    const canonicalJwkString = JSON.stringify(membersToThumbprint);

    // Calcolo del Thumbprint (Hash)
    // RFC 7638: "The thumbprint is the value of the hash function applied to the canonicalized JSON object."
    const thumbprintBuffer = crypto
        .createHash(cryptoHashAlgorithm) // Crea l'oggetto hash (es. 'sha256')
        .update(canonicalJwkString)      // Inserisce la stringa canonica
        .digest();                       // Calcola l'hash come Buffer

    const calculatedThumbprint = thumbprintBuffer.toString('base64url');
    const prefixedThumbprint = `${hashAlgorithmPrefix}-${calculatedThumbprint}`;
    return prefixedThumbprint;
}

/**
 * Recupera i dati del certificato IDP dall'assertion
 *
 * @async
 * @param {Document} assertionDoc - Documento XML 
 * @throws {LollipopAssertionException} In caso di errore nel recupero
 */
    async function getIdpCertDataAssertion(assertionDoc){
        let idpCertDataList;
        try {
            idpCertDataList = await getIdpCertData(assertionDoc);
        } catch (e) {
            console.error('[assertionValidation] Error: ', e.errorCode, ' - Message: ', e.message);
            throw new LollipopAssertionException(e);
        }
    }

/**
 * Valida e recupera nome e cognome dall’asserzione SAML
 *
 * @param {Document} assertionDoc - Documento XML 
 * @returns {{name: string, familyName: string}} Nome completo dell’utente
 * @throws {LollipopAssertionException} Se nome o cognome sono mancanti
 */
    async function validateFullNameHeader(assertionDoc){
      console.log("Starting validateFullNameHeader...");

      const fullNameHeaderFromAssertion = getFullNameHeaderFromAssertion(assertionDoc);

      if (!fullNameHeaderFromAssertion) {
        console.error('[validateFullNameHeader] Missing givenName in the retrieved SAML assertion.');
        throw new LollipopAssertionException(
          VALIDATION_ERROR_CODES.MISSING_FULLNAME,
          'Missing givenName in the retrieved SAML assertion.'
        );
      }

      return fullNameHeaderFromAssertion;
    }

/**
 * Estrae nome e cognome 
 *
 * @param {Document} assertionDoc - Documento XML 
 * @returns {{name: string, familyName: string}}
 * @throws {LollipopAssertionException} Se i campi non sono presenti
 */
    function getFullNameHeaderFromAssertion(assertionDoc) {

        console.log("Starting retrieving FullName from assertion...");

        let result = {}
        const samlNamespace = lollipopConfig.samlNamespaceAssertion;
        const tagCode = lollipopConfig.assertionAttributeTag;

        const extractAttributeValue = (targetAttributeValue, errorCode) => {
            const elements = assertionDoc.getElementsByTagNameNS(samlNamespace, tagCode);
            if (!elements || elements.length === 0) {
                console.error('[validateFullNameHeader] No elements found in the retrieved saml assertion');
                throw new LollipopAssertionException(
                    errorCode, `Missing elements with tag code '${tagCode}' in the retrieved SAML assertion.`);
            }
            for (let i = 0; i < elements.length; i++) {
                const item = elements.item(i);
                if (!item || !item.textContent) {
                    continue;
                }
                const nameNode = item.attributes.getNamedItem("Name");
                if (nameNode && nameNode.nodeValue === targetAttributeValue) {
                    result[targetAttributeValue] = item.textContent.trim();
                    return;
                }
            }
        };

        extractAttributeValue("name", VALIDATION_ERROR_CODES.NAME_NOT_FOUND);
        extractAttributeValue("familyName", VALIDATION_ERROR_CODES.SURNAME_NOT_FOUND);

        if (!("name" in result) || !("familyName" in result)) {
            throw new LollipopAssertionException(
                VALIDATION_ERROR_CODES.NAME_OR_SURNAME_NOT_FOUND,
                "Missing or invalid name/surname in the retrieved SAML assertion."
            );
        }
        return result;
    }


/**
 * Costruisce un documento XML a partire dall’assertion
 *
 * @param {Object} assertion - Oggetto contenente l’assertion XML
 * @returns {Document} Documento XML parsato
 * @throws {ErrorRetrievingAssertionException} In caso di errore di parsing
 */
function buildDocumentFromAssertion(assertion) {
  const xmlString = assertion.assertionData;

  //protezione doctype, in java viene fatto tramite flag, in js va definito
  if (xmlString.includes("<!DOCTYPE")) {
    throw new ErrorRetrievingAssertionException(
      ASSERTION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "DOCTYPE is not allowed in assertion XML"
    );
  }

  try {
    const doc = new DOMParser({
      errorHandler: {
        warning: () => { },
        error: (msg) => { throw new Error(msg); },
        fatalError: (msg) => { throw new Error(msg); },
      }
    }).parseFromString(xmlString, "text/xml");

    return doc;
  } catch (e) {
    throw new ErrorRetrievingAssertionException(
      ASSERTION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      e.message
    );
  }
}

 module.exports = {
  validateAssertionPeriod,
  validateUserId,
  validateInResponseTo,
  validateFullNameHeader,
  validateSignatureAssertion,
  getAssertionDoc,
  getIdpCertDataAssertion,
  buildDocumentFromAssertion,
  LollipopAssertionException,
  LollipopAssertionNotFoundException,
  OidcAssertionNotSupported,
  ErrorRetrievingAssertionException

};