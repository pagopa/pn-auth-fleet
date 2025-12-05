const xmldom = require('xmldom');
const jose = require('node-jose');
const { MILLISECONDS_PER_DAY, AssertionRefAlgorithms, DEAFULT_ALG_BY_KTY } = require('../app/constants/lollipopConstants');
const { VALIDATION_ERROR_CODES } = require('./constants/lollipopErrorsConstants');
const {lollipopConfig} = require('../app/config/lollipopConsumerRequestConfig')
const LollipopAssertionException = require('./exception/lollipopAssertionException');


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


 async function validateInResponseTo(request, assertionDoc){

    console.log("Starting validateInResponseTo...")
    const rootElementName = assertionDoc.documentElement.localName;
    const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionInResponseToTag);
    //console.log("listElements: ", listElements);

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
    //console.log("hashAlgorithm: ", hashAlgorithm);

    //dalla request prendo la publicKey
    const headers = request.headerParams.headers || request.headerParams;

    const publicKeyBase64Url = headers[lollipopConfig.publicKeyHeader];
    const assertionRefHeader = headers[lollipopConfig.assertionRefHeader];

    //console.log("publicKeyBase64Url: ", publicKeyBase64Url);

    const calculatedThumbprint = await computeThumbprint(hashAlgorithm, publicKeyBase64Url);

    console.log("inResponseTo: ", inResponseTo);
    console.log("calculatedThumbprint: ", calculatedThumbprint);
    console.log("assertionRefHeader: ", assertionRefHeader);

    console.log("(inResponseTo === calculatedThumbprint): ", (inResponseTo === calculatedThumbprint));
    console.log("(inResponseTo === assertionRefHeader): ", (inResponseTo === assertionRefHeader ));

    return (inResponseTo === calculatedThumbprint && inResponseTo === assertionRefHeader);
}


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

    //Calcola il thumbprint JWK da una chiave pubblica in formato Base64 URL-safe
    async function computeThumbprint(inResponseToAlgorithm, publicKeyBase64Url) {

        const jwkJsonString = Buffer.from(publicKeyBase64Url, 'base64url').toString('utf8');
        const jwkObject = JSON.parse(jwkJsonString);

        //Importa l'oggetto JSON JWK in un KeyObject di node-jose
        const keyObject = await jose.JWK.asKey(jwkObject);
        const hashAlgorithm = inResponseToAlgorithm.toLowerCase().replace('_', '');

        // Calcolo del Thumbprint (RFC 7638)
        // jose.JWK.thumbprint() calcola il thumbprint e lo restituisce come Buffer
        const thumbprintBuffer = keyObject.thumbprint(hashAlgorithm);

        // Converte il Buffer risultante in stringa Base64 URL-safe
        const calculatedThumbprint = thumbprintBuffer.toString('base64url');

        // Aggiunta del Prefisso (es. "sha256-")
        const prefixedThumbprint = `${hashAlgorithm}-${calculatedThumbprint}`;
//console.log("calculatedThumbprint: ", calculatedThumbprint);
        return prefixedThumbprint;

    }

 module.exports = {
  validateAssertionPeriod,
  validateUserId,
  validateInResponseTo,
  LollipopAssertionException,
};