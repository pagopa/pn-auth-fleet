const xmldom = require('xmldom');
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { VALIDATION_ERROR_CODES, SAML_ASSERTION, ASSERTION_EXPIRE_IN_DAYS, MILLISECONDS_PER_DAY } = require('../app/constants/lollipopConstants');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');


 function validateAssertionPeriod(assertionDoc){

    const rootElementName = assertionDoc.documentElement.localName;
    const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.NOT_BEFORE_TAG);
    if( isElementNotFound(listElements, SAML_ASSERTION.NOT_BEFORE) ) {
        console.error('[validateAssertionPeriod] The notBefore parameter is not valid or an error occurred during parsing');
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE,
            'The notBefore parameter is not valid or an error occurred during parsing'
        );
    }
    const firstConditionsElement = listElements[0];
    const notBefore = firstConditionsElement.getAttribute(SAML_ASSERTION.NOT_BEFORE);
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
    const expiresAfterMilliseconds = ASSERTION_EXPIRE_IN_DAYS * MILLISECONDS_PER_DAY;
    const dateNowLessNotBefore = (dateNowMilliseconds - notBeforeMilliseconds);
    if (isNaN(dateNowLessNotBefore) || isNaN(expiresAfterMilliseconds)) {
        console.error('[validateAssertionPeriod] the parameter dateNowLessNotBefore or the parameter expiresAfterMilliseconds is invalid or there is a parsing error');
        throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_DATE,
           'the parameter dateNowLessNotBefore or the parameter expiresAfterMilliseconds is invalid or there is a parsing error'
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


 module.exports = {
  validateAssertionPeriod,
  LollipopAssertionException,
};