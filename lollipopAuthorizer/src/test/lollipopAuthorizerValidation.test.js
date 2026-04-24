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
        stubs.validateLollipopAssertion.resolves({ resultCode: "SUCCESS", name: "Mario" });

        const result = await validateLollipopAuthorizer(mockRequest);
        expect(result.statusCode).to.equal(200);
        expect(result.resultCode).to.equal("SUCCESS");
        expect(result.name).to.equal("Mario");
    });

    // TEST 2: FALLIMENTO SIGNATURE (402)
    it("TEST 2: dovrebbe restituire 402 se la firma HTTP non è valida (tramite resultCode)", async () => {
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.resolves({ resultCode: "HTTP_MESSAGE_VALIDATION_FAILED" });

        const result = await validateLollipopAuthorizer(mockRequest);

        expect(result.statusCode).to.equal(402);
        expect(result.resultCode).to.equal("HTTP_MESSAGE_VALIDATION_FAILED");
        // Verifica che lo step 3 non venga chiamato
        expect(stubs.validateLollipopAssertion.called).to.be.false;
    });

    // TEST 3: ECCEZIONE CONTENT VALIDATION (401)
    it("TEST 3: dovrebbe gestire LollipopRequestContentValidationException e restituire 401 con codice allineato (non granulare)", async () => {
        const error = new LollipopRequestContentValidationException("FATAL_ERROR", "Invalid Headers");
        error.errorCode = "MISSING_PUBLIC_KEY";

        stubs.validateLollipopRequest.rejects(error);

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(401);
        expect(result.resultCode).to.equal("REQUEST PARAMS VALIDATION FAILED");
        expect(result.resultCode).to.not.equal("MISSING_PUBLIC_KEY");
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
        error.errorCode = "USER_ID_VALIDATION_ERROR";
        stubs.validateLollipopAssertion.rejects(error);

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(403);
        expect(result.resultCode).to.equal("USER_ID_VALIDATION_ERROR");
    });


    // --- TEST 5: ERRORE GENERICO (500)
    it("TEST 5: dovrebbe restituire 500 in caso di errore non previsto", async () => {
        stubs.validateLollipopRequest.rejects(new Error("Database offline"));

        const result = await validateLollipopAuthorizer({});

        expect(result.statusCode).to.equal(500);
        expect(result.resultCode).to.equal("ASSERTION_VERIFICATION_FAILED");
    });

    // TEST 6 (M9): il codice granulare di LollipopHttpSignatureValidationException non deve finire nell'header
    it("TEST 6: dovrebbe restituire REQUEST_VALIDATION_ERROR e non il codice granulare per LollipopHttpSignatureValidationException", async () => {
        const error = new LollipopHttpSignatureValidationException("INVALID_JWK", "JWK malformato");
        error.errorCode = "INVALID_JWK";
        stubs.validateLollipopRequest.resolves();
        stubs.validateLollipopHttpSignature.rejects(error);

        const result = await validateLollipopAuthorizer(mockRequest);

        expect(result.statusCode).to.equal(402);
        expect(result.resultCode).to.equal("REQUEST_VALIDATION_ERROR");
        expect(result.resultCode).to.not.equal("INVALID_JWK");
    });

});
