const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { VALIDATION_ERROR_CODES, ASSERTION_EXPIRE_IN_DAYS, MILLISECONDS_PER_DAY } = require('../app/constants/lollipopConstants');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');


 function validateAssertionPeriod(notBefore){
    //notBefore è nel formato 2025-11-04T11:50:33.570Z
    let notBeforeMilliseconds = Date.parse(notBefore);
    if(isNaN(notBeforeMilliseconds)) {
         console.error('[validateAssertionPeriod] NOT_BEFORE_DATE non valida o errore nel Parsing');
         throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE,
           'NOT_BEFORE_DATE non valida o errore nel Parsing'
         );
    }

    const dateNowMilliseconds = new Date().getTime();
    const expiresAfterMilliseconds = ASSERTION_EXPIRE_IN_DAYS * MILLISECONDS_PER_DAY;
    const dateNowLessNotBefore = (dateNowMilliseconds - notBeforeMilliseconds);
    if (isNaN(dateNowLessNotBefore) || isNaN(expiresAfterMilliseconds)) {
        console.error('[validateAssertionPeriod] dateNowLessNotBefore o expiresAfterMilliseconds non valida o errore nel Parsing');
        throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_DATE,
           'dateNowLessNotBefore o expiresAfterMilliseconds non valida o errore nel Parsing'
        );
    }

    //Verifichiamo la condizione: dateNowLessNotBefore && (dateNowLessNotBefore <= expiresAfterMilliseconds)
    const isNotBeforeValid = (dateNowLessNotBefore >= 0);
    const isNotExpired = (dateNowLessNotBefore <= expiresAfterMilliseconds);
    if( !(isNotBeforeValid && isNotExpired)) {
        console.error('[validateAssertionPeriod] NOT_BEFORE_DATE non valida');
        throw new LollipopAssertionException(
           VALIDATION_ERROR_CODES.NOTBEFORE_NOTVALID_DATE,
           'NOT_BEFORE_DATE non valida'
        );
    }
 }

 module.exports = {
  validateAssertionPeriod,
  LollipopAssertionException,
};