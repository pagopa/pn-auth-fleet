const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const LollipopAssertionException = require("../app/exception/LollipopAssertionException");
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const LollipopHttpSignatureValidationException = require('../app/exception/lollipopHttpSignatureValidationException');


describe("Lollipop Authorizer Validation Suite Test", () => {
  let validateLollipopAuthorizer;
  let stubs;

  beforeEach(() => {
    stubs = {
      validateLollipopRequest: sinon.stub(),
      validateLollipopHttpSignature: sinon.stub(),
      validateLollipopAssertion: sinon.stub(),
    };

    // Iniettiamo i mock
    const module = proxyquire("../app/lollipopAuthorizerValidation", {
      "../app/lollipopRequestValidation": { validateLollipopRequest: stubs.validateLollipopRequest },
      "../app/lollipopHttpSignatureValidation": { validateLollipopHttpSignature: stubs.validateLollipopHttpSignature },
      "../app/lollipopAssertionValidation": { validateLollipopAssertion: stubs.validateLollipopAssertion },
    });
    validateLollipopAuthorizer = module.validateLollipopAuthorizer;
  });

    const mockRequest = { headers: {} };

    afterEach(() => {
        sinon.restore();
    });


    // TEST1: SUCCESS - 200
    it("TEST 1: Successo: deve restituire 200 quando l'assertion è valida", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_SUCCESS" });
        stubs.validateLollipopAssertion.resolves({ resultCode: "VERIFICATION_SUCCESS_CODE", name: "Mario" });

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(200);
        expect(result.resultCode).to.equal("VERIFICATION_SUCCESS_CODE");
        expect(result.name).to.equal("Mario");
    });

    // TEST 2: FALLIMENTO SIGNATURE (402)
    it("TEST 2: dovrebbe restituire 402 se la firma HTTP non è valida (tramite resultCode)", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({
            resultCode: "HTTP_MESSAGE_VALIDATION_FAILED", // Diverso da SUCCESS
            resultMessage: "Validation of HTTP message failed, authentication failed"  //Invalid Signature"
        });

        const result = await validateLollipopAuthorizer(mockRequest);

        expect(result.statusCode).to.equal(402);
        expect(result.resultCode).to.equal("HTTP_MESSAGE_VALIDATION_FAILED");
        // Verifica che lo step 3 non venga chiamato
        expect(stubs.validateLollipopAssertion.called).to.be.false;
    });

    // TEST 3: ECCEZIONE CONTENT VALIDATION (401)
    it("TEST 3: dovrebbe gestire LollipopRequestContentValidationException e restituire 401", async () => {
        const error = new LollipopRequestContentValidationException("FATAL_ERROR", "Invalid Headers");
        error.errorCode = "REQUEST_PARAMS_VALIDATION_FAILED";

        stubs.validateLollipopRequest.rejects(error);

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(401);
        expect(result.resultCode).to.equal("REQUEST_PARAMS_VALIDATION_FAILED");
        expect(result.resultMessage).to.contain("Invalid Headers");
        // Verifica che lo step 2 non venga chiamato
        expect(stubs.validateLollipopHttpSignature.called).to.be.false;
    });

    // TEST 4: ECCEZIONE ASSERTION (403) ---
    it("TEST 4: dovrebbe gestire LollipopAssertionException e restituire 403", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_SUCCESS" });

        const error = new LollipopAssertionException( "INVALID_USER_ID",
                            "The user id in the assertion does not match the request header");
        error.errorCode = "REQUEST_ASSERTION_VALIDATION_FAILED";
        stubs.validateLollipopAssertion.rejects(error);

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(403);
        expect(result.resultCode).to.equal("REQUEST_ASSERTION_VALIDATION_FAILED");
    });


    // --- TEST 5: ERRORE GENERICO (500)
    it("TEST 5: dovrebbe restituire 500 in caso di errore non previsto", async () => {
        stubs.validateLollipopRequest.rejects(new Error("Database offline"));

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(500);
        expect(result.resultCode).to.equal("FATAL_ERROR");
    });

});
