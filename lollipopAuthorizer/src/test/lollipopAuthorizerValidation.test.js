import { expect  } from "chai";
import sinon from "sinon";
import esmock from "esmock";

import LollipopAssertionException from "../app/exception/lollipopAssertionException.js";
import LollipopRequestContentValidationException from "../app/exception/lollipopRequestContentValidationException.js";
import LollipopHttpSignatureValidationException from "../app/exception/lollipopHttpSignatureValidationException.js";


describe("Lollipop Authorizer Validation Suite Test", () => {
  let validateLollipopAuthorizer;
  let stubs;

  beforeEach(async () => {
    stubs = {
      validateLollipopRequest: sinon.stub(),
      validateLollipopHttpSignature: sinon.stub(),
      validateLollipopAssertion: sinon.stub(),
    };

    // Iniettiamo i mock con esmock
    const module = await esmock("../app/lollipopAuthorizerValidation.js", {
      "../app/lollipopRequestValidation.js": { validateLollipopRequest: stubs.validateLollipopRequest },
      "../app/lollipopHttpSignatureValidation.js": { validateLollipopHttpSignature: stubs.validateLollipopHttpSignature },
      "../app/lollipopAssertionValidation.js": { validateLollipopAssertion: stubs.validateLollipopAssertion },
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
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_FAILED" });

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(402);
    });

    // TEST 3: FALLIMENTO REQUEST PARAMS (400)
    it("TEST 3: dovrebbe restituire 401 se c'è un errore nella validazione dei parametri della richiesta", async () => {
        const error = new LollipopRequestContentValidationException("REQUEST_PARAMS_VALIDATION_FAILED", "Error detail");
        stubs.validateLollipopRequest.rejects(error);

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(401);
        expect(result.resultCode).to.equal("REQUEST_PARAMS_VALIDATION_FAILED");
    });

    // TEST 4: FALLIMENTO ASSERTION (401)
    it("TEST 4: dovrebbe restituire 403 se c'è un errore di asserzione", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_SUCCESS" });

        const error = new LollipopAssertionException("REQUEST_ASSERTION_VALIDATION_FAILED", "Assertion error");
        stubs.validateLollipopAssertion.rejects(error);

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(403);
        expect(result.resultCode).to.equal("REQUEST_ASSERTION_VALIDATION_FAILED");
    });

    // TEST 5: FALLIMENTO HTTP SIGNATURE (402)
    it("TEST 5: dovrebbe restituire 402 se c'è un errore nella firma HTTP", async () => {
        stubs.validateLollipopRequest.resolves();

        const error = new LollipopHttpSignatureValidationException("HTTP_SIGNATURE_VALIDATION_FAILED", "Signature error");
        stubs.validateLollipopHttpSignature.rejects(error);

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(402);
        expect(result.resultCode).to.equal("HTTP_SIGNATURE_VALIDATION_FAILED");
    });

    // TEST 6: ERRORE GENERICO (500)
    it("TEST 6: dovrebbe restituire 500 per errori generici non previsti", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_SUCCESS" });

        const error = new Error("Unexpected error");
        stubs.validateLollipopAssertion.rejects(error);

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(500);
        expect(result.resultCode).to.equal("FATAL_ERROR");
    });
});
