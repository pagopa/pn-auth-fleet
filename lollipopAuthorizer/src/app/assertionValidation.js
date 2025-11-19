const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { VALIDATION_ERROR_CODES, ASSERTION_EXPIRE_IN_DAYS, MILLISECONDS_PER_DAY } = require('../app/constants/lollipopConstants');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');


 function validateAssertionPeriod(notBefore){
    //notBefore è nel formato 2025-11-04T11:50:33.570Z
    let notBeforeMilliseconds = Date.parse(notBefore);
    if(isNaN(notBeforeMilliseconds)) {
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
    if( !(isNotBeforeValid && isNotExpired)) {
        console.error('[validateAssertionPeriod] The notBefore parameter is not valid');
        throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.NOTBEFORE_NOTVALID_DATE,
           'The notBefore parameter is not valid'
        );
    }
 }

 module.exports = {
  validateAssertionPeriod,
  LollipopAssertionException,
};