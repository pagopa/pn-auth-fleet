const xmldom = require('xmldom');
const { VALIDATION_ERROR_CODES, MILLISECONDS_PER_DAY } = require('../app/constants/lollipopConstants');
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

 module.exports = {
  validateAssertionPeriod,
  validateUserId,
  LollipopAssertionException,
};