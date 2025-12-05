const {expect} = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const xmldom = require('xmldom');
const base64url = require('base64url');
const { validateAssertionPeriod, validateUserId, validateInResponseTo } = require('../app/assertionValidation');
const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const { lollipopConfig } = require('../app/config/lollipopConsumerRequestConfig');
const { VALID_ASSERTION_XML, VALIDATION_PARAMS, EC_JWK, RSA_JWK } = require('../test/constants/lollipopConstantsTest');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');


describe('validateAssertionPeriodTest ', () => {

    console.log('validateAssertionPeriod TEST');

    it('should return TRUE if date is valid or not expired', async () => {

        console.log('TEST 1 - Caricamento Document Assertion fake per test ');
        //per rendere dinamico il test sul notBefore, andiamo a far in modo che sia sempre valido partendo dalla data odiera (invece che fare il mock del metodo)
        const now = new Date();
        const notBeforeDate = new Date(now.getTime() - 1000); // 1 secondo fa
        const notBeforeIso = notBeforeDate.toISOString(); // formato es 2025-11-04T11:50:33.570Z

        // sostituzione del campo notBefore nella stringa xml
        const xmlWithDynamicNotBefore = VALID_ASSERTION_XML.replace(
            /NotBefore="[^"]*"/,
            `NotBefore="${notBeforeIso}"`
        );
        
        const assertionDoc = new xmldom.DOMParser().parseFromString(xmlWithDynamicNotBefore, "text/xml");

        console.log("validateAssertionPeriod ...");
        const result = validateAssertionPeriod(assertionDoc);
        expect(result).to.be.true;
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is invalid', async() => {

        console.log('TEST 2 - Caricamento Document Assertion fake per test ');
           const xmlWithInvalidNotBefore = VALID_ASSERTION_XML.replace(
            /NotBefore="[^"]*"/,
            `NotBefore="invalidFormat"`
        );
        
        const assertionDoc = new xmldom.DOMParser().parseFromString(xmlWithInvalidNotBefore, "text/xml");

        expect(() => validateAssertionPeriod(assertionDoc))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);

    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null', async() => {

        console.log('TEST 3 - Caricamento Document Assertion fake per test ');
           const xmlWithNullNotBefore = VALID_ASSERTION_XML.replace(
            /NotBefore="[^"]*"/,
            `NotBefore=""`
        );
        
        const assertionDoc = new xmldom.DOMParser().parseFromString(xmlWithNullNotBefore, "text/xml");

        expect(() => validateAssertionPeriod(assertionDoc))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);

    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is not present', async() => {

        console.log('TEST 4 - Caricamento Document Assertion fake per test ');
        const invalidXml = `<Assertion xmlns="urn:oasis:names:tc:SAML:2.0:assertion">
                            <Conditions></Conditions>
                            </Assertion>`;
        const assertionDoc = new xmldom.DOMParser().parseFromString(invalidXml, "text/xml");

        expect(() => validateAssertionPeriod(assertionDoc))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);

    });

    it('should throw FALSE if date is expired', async () => {

        console.log('TEST 5 - Caricamento Document Assertion fake per test ');
          const xmlWithExpiredDate = VALID_ASSERTION_XML.replace(
            /NotBefore="[^"]*"/,
            `NotBefore="2010-11-04T11:50:33.570Z"`
        );
        
        const assertionDoc = new xmldom.DOMParser().parseFromString(xmlWithExpiredDate, "text/xml");

        console.log("validateAssertionPeriod ...");
        const result = validateAssertionPeriod(assertionDoc);
        expect(result).to.be.false;
    });

});


describe("validateUserId tests", () => {

  it("should return TRUE if fiscalNumber and userId header match", () => {
    const assertionDoc = new xmldom.DOMParser().parseFromString(VALID_ASSERTION_XML, "text/xml");

    const request = {
      headerParams: {
        [lollipopConfig.userIdHeader]: "GDNNWA12H81Y874F"
      }
    };

    const result = validateUserId(request, assertionDoc);

    expect(result).to.equal(true);
  });

  it("should return FALSE if fiscalNumber and userId header don't match", () => {
    const assertionDoc = new xmldom.DOMParser().parseFromString(VALID_ASSERTION_XML, "text/xml");

    const request = {
      headerParams: {
        [lollipopConfig.userIdHeader]: "AAAAAA00A00A000A"
      }
    };

    const result = validateUserId(request, assertionDoc);

    expect(result).to.equal(false);
  });

  it("should return FALSE when userId header is null", () => {
    const assertionDoc = new xmldom.DOMParser().parseFromString(VALID_ASSERTION_XML, "text/xml");

    const request = {
      headerParams: {}
    };

    const result = validateUserId(request, assertionDoc);

    expect(result).to.equal(false);
  });

  it("should throw error when fiscalNumber is not in assertionDoc", () => {
    const invalidAssertion = VALID_ASSERTION_XML.replace(
      "<saml:Attribute Name=\"fiscalNumber\">",
      "<saml:Attribute Name=\"wrongTag\">"
    );
    const request = {
      headerParams: {
        [lollipopConfig.userIdHeader]: "AAAAAA00A00A000A"
      }
    };
    const assertionDoc = new xmldom.DOMParser().parseFromString(invalidAssertion, "text/xml");

    expect(() => validateUserId(request, assertionDoc)).to.throw(LollipopAssertionException);
  });

  it("should pass with prefix TINIT-", () => {
    const assertionWithTinit = VALID_ASSERTION_XML.replace(
      "GDNNWA12H81Y874F",
      "TINIT-GDNNWA12H81Y874F"
    );

    const assertionDoc = new xmldom.DOMParser().parseFromString(assertionWithTinit, "text/xml");

    const request = {
      headerParams: {
        [lollipopConfig.userIdHeader]: "GDNNWA12H81Y874F"
      }
    };

    const result = validateUserId(request, assertionDoc);

    expect(result).to.equal(true);
  });

  it("should throws error when assertionDoc is empty", () => {
    const emptyAssertion = new xmldom.DOMParser().parseFromString("<root/>", "text/xml");

    const request = {
      headerParams: {
        [lollipopConfig.userIdHeader]: "GDNNWA12H81Y874F"
      }
    };

    expect(() => validateUserId(request, emptyAssertion)).to.throw(LollipopAssertionException); 
  });

});


describe("validateInResponseTo tests", () => {

    const assertionDoc = new xmldom.DOMParser().parseFromString(VALID_ASSERTION_XML, "text/xml");
    const ecKeyBase64 = base64url.encode(JSON.stringify( EC_JWK));
    const rsaKeyBase64 = base64url.encode(JSON.stringify(RSA_JWK));

    const request = {
      headerParams: {
        [lollipopConfig.assertionRefHeader]: "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
        [lollipopConfig.publicKeyHeader]: ecKeyBase64
      }
    };

    it("TEST_1: should accept valid SHA256 inResponseTo", async () => {
        const resultPromise = validateInResponseTo(request, assertionDoc);
        //await expect(resultPromise).to.be.fulfilled;
        //const result = await resultPromise;
        await expect(resultPromise).to.eventually.be.true;
    });

    it('TEST_2: should accept valid SHA384 inResponseTo', async () => {
        const validAssertionDocSHA384 = VALID_ASSERTION_XML.replace(
            "sha256-Iz4GEYGtznLdLyHrbtKEkzb6qSJpOkKvsOsCxgXkIhI",
            VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA384
        );
        const assertionDocSHA384 = new xmldom.DOMParser().parseFromString(validAssertionDocSHA384, "text/xml");
        await expect(validateInResponseTo(request, assertionDocSHA384)).to.be.fulfilled;
      });

      it('TEST_3: should accept valid SHA512 inResponseTo', async () => {
        const validAssertionDocSHA512 = VALID_ASSERTION_XML.replace(
            "sha256-Iz4GEYGtznLdLyHrbtKEkzb6qSJpOkKvsOsCxgXkIhI",
            VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA512
        );
        const assertionDocSHA512 = new xmldom.DOMParser().parseFromString(validAssertionDocSHA512, "text/xml");
        await expect(validateInResponseTo(request, assertionDocSHA512)).to.be.fulfilled;
      });

    it("TEST_4: should throw error if header and XML InResponseTo do not match", async () => {
        // Header con un valore diverso
        const mismatchRequest = {
            headerParams: {
                [lollipopConfig.assertionRefHeader]: "sha256-AAAAA-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw", //VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256,
                [lollipopConfig.publicKeyHeader]: ecKeyBase64
            }
        };
        try {
            await validateInResponseTo(mismatchRequest, assertionDoc);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_ALGORITHM_NOT_VALID);
        }
    });

    it("TEST_5: should throw error if XML InResponseTo format is invalid", async () => {
        const invalidXml = VALID_ASSERTION_XML.replace(
            "sha256-Iz4GEYGtznLdLyHrbtKEkzb6qSJpOkKvsOsCxgXkIhI",
            "sha256-short"
        );
        const invalidDoc = new xmldom.DOMParser().parseFromString(invalidXml, "text/xml");
        const request = {
            headerParams: {
                [lollipopConfig.assertionRefHeader]: "sha256-short",
                [lollipopConfig.publicKeyHeader]: ecKeyBase64
            }
        };

        try {
            await validateInResponseTo(request, invalidDoc);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_FIELD_NOT_FOUND);
        }
    });

});
