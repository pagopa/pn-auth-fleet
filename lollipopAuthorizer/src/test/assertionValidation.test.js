const {expect} = require('chai');
const chai = require('chai');
const { validateAssertionPeriod, LollipopAssertionException } = require('../app/assertionValidation');
const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopConstants');

describe('validateAssertionPeriodTest ', () => {
    console.log('validateAssertionPeriod TEST');

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', async () => {
        try{
            validateAssertionPeriod("2025-11-04T11:50:33.570Z");
            console.log('notBefore is VALID');
        } catch(err) {
            expect(err).to.be.instanceOf(LollipopAssertionException);
            expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);
        }
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', async () => {
        try{
            validateAssertionPeriod("2025-11-04T13.570Z");
        } catch(err) {
           expect(err).to.be.instanceOf(LollipopAssertionException);
           expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);
        }
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', async () => {
         try{
             validateAssertionPeriod('');
         } catch(err) {
            expect(err).to.be.instanceOf(LollipopAssertionException);
            expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);
         }
     });

    it('should throw NOTBEFORE_NOTVALID_DATE if notBefore is not valid', async () => {
         try{
             validateAssertionPeriod("2020-11-04T11:50:33.570Z");
         } catch(err) {
            expect(err).to.be.instanceOf(LollipopAssertionException);
            expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.NOTBEFORE_NOTVALID_DATE);
         }
     });
});

