const {expect} = require('chai');
const chai = require('chai');
const { validateAssertionPeriod, LollipopAssertionException } = require('../app/assertionValidation');
const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopConstants');

describe('validateAssertionPeriodTest ', () => {
    console.log('validateAssertionPeriod TEST');

    it('dovrebbe restituire TRUE quando la data è valida e non è scaduta', () => {
        const notBefore = "2025-11-04T11:50:33.570Z";
        const result = validateAssertionPeriod(notBefore);
        expect(result).to.be.true;
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', () => {
        const notBeforeIsNotValidParsing = "2025-11-04T13.570Z";
        expect(() => validateAssertionPeriod(notBeforeIsNotValidParsing))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', () => {
        const notBeforeIsNull = "";
        expect(() => validateAssertionPeriod(notBeforeIsNull))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);
    });

    it('dovrebbe restituire FALSE quando la data è valida ma è scaduta', () => {
        const notBeforeIsNotValid = "2020-11-04T11:50:33.570Z";
        const result = validateAssertionPeriod(notBeforeIsNotValid);
        expect(result).to.be.false;
    });

});

