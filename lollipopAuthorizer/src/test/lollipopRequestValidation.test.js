const { expect } = require("chai");
const base64url = require('base64url');
const { validateLollipopRequest } = require("../app/lollipopRequestValidation");
const { lollipopConfig } = require("../app/config/lollipopConsumerRequestConfig");
const { LollipopRequestContentValidationException } = require("../app/requestValidation");
const { EC_JWK, RSA_JWK, VALIDATION_PARAMS } = require("./constants/lollipopConstantsTest");
const { VALIDATION_ERROR_CODES } = require("../app/constants/lollipopConstants");



/* Test che prevedeva dati reali. Commentato per non causare errori in fase di build sull'ambiente, a causa dei file non condivisibili.

const reqPost = require("./fileTest/postRequest.json");
const reqGet = require("./fileTest/getRequest.json");

describe("validateLollipopRequest - real tests success", () => {

  const testCases = [
    ["request real POST", reqPost],
    ["request real GET", reqGet]
  ];

  testCases.forEach(([label, requestContent]) => {

    it(`should validate ${label} without throwing`, async () => {
    const request = {
        headerParams: requestContent
    };

    try {
        await validateLollipopRequest(request);
        expect(true).to.be.true; 
    } catch (e) {
        console.error(`Validation failed for ${label}:`, e);
        throw e; 
    }
    });
  });
});

*/

const TEST_CASES = [
  { name: "EC Public Key", publicKey: EC_JWK },
  { name: "RSA Public Key", publicKey: RSA_JWK },
];

const HTTP_METHODS = ["GET", "POST"];

//Casi di test OK/KO (dati NON reali)
describe("validateLollipopRequest - validating headers with EC/RSA key and HTTP methods", () => {
  TEST_CASES.forEach(({ name, publicKey }) => {
    HTTP_METHODS.forEach((method) => {
      it(`should validate request with ${name} and ${method} without throwing`, async () => {
        const request = buildValidRequest({ publicKey, method });

        let error;
        try {
          await validateLollipopRequest(request);
        } catch (e) {
          error = e;
        }

        expect(error).to.be.undefined;
      });

      it("should fail if a required header is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.publicKeyHeader]: null }
        });
        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal("MISSING_PUBLIC_KEY");
        }
      });

      it("should fail if assertionRef is invalid", async () => {
        console.log("PUBLIC KEYYY: ", publicKey)
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.assertionRefHeader]: "12x////" }
        });
        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal("INVALID_ASSERTION_REF");
        }
      });

      it("should fail when assertionType is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.assertionTypeHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_ASSERTION_TYPE_ERROR);
        }
      });
      it("should fail when assertionType is invalid", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.assertionTypeHeader]: "NOT_SUPPORTED" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_TYPE_ERROR);
        }
      });
      it("should fail when userId is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.userIdHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_USER_ID);
        }
      });
      it("should fail when userId does not match CF regex", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.userIdHeader]: "BB00AHB36/H308Z86HAG" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_USER_ID);
        }
      });
      it("should fail when auth-jwt header is missing", async () => {
        const request = buildValidRequest({
          publicKey: EC_JWK,
          method: "GET",
          overrides: { [lollipopConfig.authJWTHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_AUTH_JWT);
        }
      });
      it("should fail when auth-jwt is empty", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.authJWTHeader]: "" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_AUTH_JWT);
        }
      });
      it("should fail when original-method is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.originalMethodHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();

        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_ORIGINAL_METHOD);
        }
      });
      it("should fail when original-method is unexpected", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.originalMethodHeader]: "PATCH" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_METHOD);
        }
      });
      it("should fail when original-url is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.originalURLHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_ORIGINAL_URL);
        }
      });
      it("should fail when original-url has invalid format", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.originalURLHeader]: "notaurl" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ORIGINAL_URL);
        }
      });
      it("should fail when original-url does not match expected prefix", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.originalURLHeader]: "https://abcd.com/data" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_URL);
        }
      });
      it("should fail when signature-input is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.signatureInputHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_SIGNATURE_INPUT);
        }
      });
      it("should fail when signature-input is invalid", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.signatureInputHeader]: "invalid-signature-input" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_SIGNATURE_INPUT);
        }
      });
      it("should fail when signature is missing", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.signatureHeader]: null }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_SIGNATURE);
        }
      });
      it("should fail when signature is invalid", async () => {
        const request = buildValidRequest({
          publicKey,
          method,
          overrides: { [lollipopConfig.signatureHeader]: "INVALID" }
        });

        try {
          await validateLollipopRequest(request);
          expect.fail();
        } catch (err) {
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_SIGNATURE);
        }
      });


    });
  });
});

//con l'oggetto overrides possiamo sovrascrivere i parametri censiti per casi di test ad hoc senza duplicazioni
//es: buildValidRequest({publicKey, method,  overrides: { [lollipopConfig.userIdHeader]: "BBBBBB22A44C555X" } });
function buildValidRequest({ publicKey, method, overrides = {} } = {}) {
  const defaultHeaders = {
    [lollipopConfig.publicKeyHeader]: publicKey,
    [lollipopConfig.assertionRefHeader]: VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256,
    [lollipopConfig.assertionTypeHeader]: VALIDATION_PARAMS.VALID_ASSERTION_TYPE,
    [lollipopConfig.userIdHeader]: VALIDATION_PARAMS.VALID_FISCAL_CODE,
    [lollipopConfig.authJWTHeader]: VALIDATION_PARAMS.VALID_JWT,
    [lollipopConfig.originalMethodHeader]: method,
    [lollipopConfig.originalURLHeader]: VALIDATION_PARAMS.VALID_ORIGINAL_URL,
    [lollipopConfig.signatureInputHeader]: VALIDATION_PARAMS.VALID_SIGNATURE_INPUT,
    [lollipopConfig.signatureHeader]: VALIDATION_PARAMS.VALID_SIGNATURE,
  };
  return {
    headerParams: { ...defaultHeaders, ...overrides },
  };
}