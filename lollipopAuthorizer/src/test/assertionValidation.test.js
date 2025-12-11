const {expect} = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const xmldom = require('xmldom');
const base64url = require('base64url');
const { validateAssertionPeriod, validateUserId, validateInResponseTo, validateFullNameHeader } = require('../app/assertionValidation');
const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const { lollipopConfig } = require('../app/config/lollipopConsumerRequestConfig');
const { VALID_ASSERTION_XML, VALIDATION_PARAMS, EC_JWK, VALID_JWK, RSA_JWK, NOT_VALID_JWK,
		ASSERTION_XML_WITHOUT_ATTRIBUTE_TAG, ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA384_ALGORITHM,
		ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA512_ALGORITHM } = require('../test/constants/lollipopConstantsTest');
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
    const ecKeyBase64 = base64url.encode(JSON.stringify( VALID_JWK));
    const ecKeyNotValid = base64url.encode(JSON.stringify( NOT_VALID_JWK));
    const rsaKeyBase64 = base64url.encode(JSON.stringify(RSA_JWK));

    const request = {
      headerParams: {
        [lollipopConfig.assertionRefHeader]: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg", //"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
        [lollipopConfig.publicKeyHeader]: ecKeyBase64
      }
    };

    it("TEST_1: should accept valid SHA256 inResponseTo", async () => {

    const validAssertionDocSHANew = VALID_ASSERTION_XML.replaceAll(
                "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
                "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg"
            );
            const assertionDocNew = new xmldom.DOMParser().parseFromString(validAssertionDocSHANew, "text/xml");

        const resultPromise = validateInResponseTo(request, assertionDocNew);
        await expect(resultPromise).to.eventually.be.true;
    });

    it('TEST_2: should accept valid SHA384 inResponseTo', async () => {

        const assertionDocSHA384 = new xmldom.DOMParser().parseFromString(ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA384_ALGORITHM, "text/xml");
        const request = {
              headerParams: {
                [lollipopConfig.assertionRefHeader]:  "sha384-lqxC_2kqMdwiBWoD-Us63Fha6e3bE1Y3yUz8G6IJTldohJCIBVDfvS8acB3GJBhw",
                [lollipopConfig.publicKeyHeader]: ecKeyBase64
                }
        };

        await expect(validateInResponseTo(request, assertionDocSHA384)).to.eventually.be.true;
     });


      it('TEST_3: should accept valid SHA512 inResponseTo', async () => {

        const assertionDocSHA512 = new xmldom.DOMParser().parseFromString(ASSERTION_XML_WITH_VALID_INRESPONSETO_SHA512_ALGORITHM, "text/xml");
        const request = {
              headerParams: {
                [lollipopConfig.assertionRefHeader]:  "sha512-nX5CfUc5R-FoYKYZwvQMuc4Tt-heb7vHi_O-AMUSqHNVCw9kNaN2SVuN-DXtGXyUhrcVcQdCyY6FVzl_vyWXNA",
                [lollipopConfig.publicKeyHeader]: ecKeyBase64
                }
        };

        await expect(validateInResponseTo(request, assertionDocSHA512)).to.eventually.be.true;
      });


    it("TEST_4: should throw error if header and XML InResponseTo do not match", async () => {

    const validAssertionDocSHANew = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg"
        );
        const assertionDocNew = new xmldom.DOMParser().parseFromString(validAssertionDocSHANew, "text/xml");

        // Header con un valore diverso
        const mismatchRequest = {
            headerParams: {
                [lollipopConfig.assertionRefHeader]: "sha256-AAAAA-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
                [lollipopConfig.publicKeyHeader]: ecKeyBase64
            }
        };
        try {
            await validateInResponseTo(mismatchRequest, assertionDocNew);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_ALGORITHM_NOT_VALID);
        }
    });


    it("TEST_5: should throw error if InResponseTo format is invalid", async () => {
        const invalidXml = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            "sha256-short!!!"
        );
        const invalidDoc = new xmldom.DOMParser().parseFromString(invalidXml, "text/xml");
        try {
            await validateInResponseTo(request, invalidDoc);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_ALGORITHM_NOT_VALID);
        }

    });

    it("TEST_6: should throw error if InResponseTo is not found ", async () => {
        const invalidXml = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            ""
        );
        const invalidDoc = new xmldom.DOMParser().parseFromString(invalidXml, "text/xml");
        try {
            await validateInResponseTo(request, invalidDoc);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.IN_RESPONSE_TO_FIELD_NOT_FOUND);
        }

    });

    it("TEST_7: should throw error if JWK is not supported  ", async () => {

        const validAssertionDocSHANew = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg"
        );
        const assertionDocNew = new xmldom.DOMParser().parseFromString(validAssertionDocSHANew, "text/xml");

            const request = {
              headerParams: {
                [lollipopConfig.assertionRefHeader]: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg", //"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
                [lollipopConfig.publicKeyHeader]: ecKeyNotValid
              }
            };

            try {
                await validateInResponseTo(request, assertionDocNew);
            } catch (err) {
              expect(err).to.be.instanceOf(LollipopAssertionException);
              expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY);
            }
        });


    it("TEST_8: should not match valid SHA256 inResponseTo with rsaKeyBase64 publicKey ", async () => {

        const validAssertionDocSHANew = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg"
        );
        const assertionDocNew = new xmldom.DOMParser().parseFromString(validAssertionDocSHANew, "text/xml");

        const request = {
          headerParams: {
            [lollipopConfig.assertionRefHeader]: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg", //"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            [lollipopConfig.publicKeyHeader]: rsaKeyBase64
          }
        };

        const resultPromise = validateInResponseTo(request, assertionDocNew);
        await expect(resultPromise).to.eventually.be.false;
    });



    it("TEST_8: should not match valid SHA256 inResponseTo with rsaKeyBase64 publicKey ", async () => {

        const validAssertionDocSHANew = VALID_ASSERTION_XML.replaceAll(
            "sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg"
        );
        const assertionDocNew = new xmldom.DOMParser().parseFromString(validAssertionDocSHANew, "text/xml");

        const request = {
          headerParams: {
            [lollipopConfig.assertionRefHeader]: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg", //"sha256-chG21HBOK-wJp2hHuYPrx7tAII2UGWVF-IFo0crUOtw",
            [lollipopConfig.publicKeyHeader]: rsaKeyBase64
          }
        };

        const resultPromise = validateInResponseTo(request, assertionDocNew);
        await expect(resultPromise).to.eventually.be.false;
    });



});


describe("validateFullNameHeader tests", () => {

    const assertionDoc = new xmldom.DOMParser().parseFromString(VALID_ASSERTION_XML, "text/xml");

    it("TEST_1: should accept valid FullName in Header", async () => {

        const mappaOggetto = await validateFullNameHeader( assertionDoc);
        console.log("MAPPA CORRENTE: ", mappaOggetto);
        expect(mappaOggetto).to.be.an('object').that.is.not.null;
        expect(mappaOggetto.name).to.equal('Mario');
        expect(mappaOggetto.familyName).to.equal('Bianchi');

    });

    it("TEST_2: should not accept FullName in Header for name null", async () => {

        const invalidName = VALID_ASSERTION_XML.replaceAll( "Mario", "");
        const invalidNameAssertionDoc = new xmldom.DOMParser().parseFromString(invalidName, "text/xml");

        try {
            const mappaOggetto = await validateFullNameHeader( invalidNameAssertionDoc);
            console.log("MAPPA CORRENTE: ", mappaOggetto);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.NAME_OR_SURNAME_NOT_FOUND);
        }

    });

    it("TEST_3: should not accept FullName in Header for familyName null", async () => {

        const invalidName = VALID_ASSERTION_XML.replaceAll( "Bianchi", "");
        const invalidNameAssertionDoc = new xmldom.DOMParser().parseFromString(invalidName, "text/xml");

        try {
            const mappaOggetto = await validateFullNameHeader( invalidNameAssertionDoc);
            console.log("MAPPA CORRENTE: ", mappaOggetto);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopAssertionException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.NAME_OR_SURNAME_NOT_FOUND);
        }

    });

    it("TEST_4: should not accept FullName in Header for Attribute is null", async () => {

            const invalidNameAssertionDoc = new xmldom.DOMParser().parseFromString(ASSERTION_XML_WITHOUT_ATTRIBUTE_TAG, "text/xml");

            try {
                const mappaOggetto = await validateFullNameHeader( invalidNameAssertionDoc);
                console.log("MAPPA CORRENTE: ", mappaOggetto);
            } catch (err) {
              expect(err).to.be.instanceOf(LollipopAssertionException);
              expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.NAME_NOT_FOUND);
            }

        });

});