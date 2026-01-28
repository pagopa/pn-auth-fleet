///npm install --save-dev mocha chai@4 sinon sinon-chai@3.7.0 esmock
import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import esmock from "esmock";
const { expect } = chai;
chai.use(sinonChai);

import { VALIDATION_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import { VALID_ASSERTION_XML, VALIDATION_PARAMS, VALID_JWT, VALID_IDP_CERTIFICATE  } from "../test/constants/lollipopConstantsTest.js";
import CommandResult from "../app/model/CommandResult.js";
import LollipopAssertionException from "../app/exception/lollipopAssertionException.js";
import { lollipopConfig  } from "../app/config/lollipopConsumerRequestConfig.js";

const mockCommandResult = function() {
        this.resultCode = null;
        this.resultMessage = null;
        this.name = null;
        this.familyName = null;
};

const mockRequestValidation = {
    getAssertionDoc: sinon.stub(),
    validateAssertionPeriod: sinon.stub(),
    validateUserId: sinon.stub(),
    validateInResponseTo: sinon.stub(),
    getIdpCertDataAssertion: sinon.stub(),
    validateSignatureAssertion: sinon.stub(),
    validateFullNameHeader: sinon.stub(),
};

// Funzione helper per simulare il successo di tutte le validazioni critiche
const setupSuccessfulMocks = (stubs) => {
    stubs.getAssertionDoc.resolves({ assertionData: VALID_ASSERTION_XML });
    stubs.getIdpCertDataAssertion.resolves([ { cert: VALID_IDP_CERTIFICATE } ]);
    stubs.validateAssertionPeriod.resolves(true);
    stubs.validateUserId.resolves(true);
    stubs.validateInResponseTo.resolves(true);
    stubs.validateSignatureAssertion.resolves(true);
    stubs.validateFullNameHeader.resolves({ name: 'Mario', familyName: 'Rossi' });
};

let mockRequest = {
    headerParams: {
        headers: {
            'x-pagopa-lollipop-auth-jwt': VALID_JWT,
            'x-pagopa-lollipop-assertion-ref': VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256
        }
    }
};

describe('TEST lollipopValidateLollipopAssertion', () => {

    let validateLollipopAssertion;

    // Carica il modulo con esmock prima di tutti i test
    before(async () => {
        const module = await esmock('../app/lollipopAssertionValidation.js', {
            '../app/assertionValidation.js': mockRequestValidation,
            '../app/model/CommandResult.js': { default: mockCommandResult },
            '../app/config/lollipopConsumerRequestConfig.js': { lollipopConfig },
            '../app/constants/lollipopErrorsConstants.js': { VALIDATION_ERROR_CODES },
            '../app/exception/lollipopAssertionException.js': { default: LollipopAssertionException },
        });
        validateLollipopAssertion = module.validateLollipopAssertion;
    });

    // Prima di ogni test, resettiamo il comportamento dei mock (stub)
    beforeEach(() => {
        sinon.reset(); 
        setupSuccessfulMocks(mockRequestValidation);
    });

    afterEach(() => {
        sinon.restore();
    });

    // TEST 1: SCENARIO DI SUCCESSO COMPLETO
    it('TEST 1: dovrebbe completare tutte le validazioni e restituire CommandResult 200', async () => {
        console.log("Tipo di CommandResult: ", typeof CommandResult);
        const result = await validateLollipopAssertion(mockRequest);
        console.log("result: ", result);
        // 1. Verifica che tutte le chiamate critiche siano avvenute
        expect(mockRequestValidation.getAssertionDoc.calledOnce).to.be.true;
        expect(mockRequestValidation.validateSignatureAssertion.calledOnce).to.be.true;
        
        // 2. Verifica che il risultato sia popolato correttamente
        //expect(result).to.be.an.instanceOf(CommandResult);
        expect(result.resultCode).to.equal("VERIFICATION_SUCCESS_CODE");
        expect(result.name).to.equal('Mario');
        expect(result.familyName).to.equal("Rossi");
    });
	
	// TEST 2: VALIDAZIONE PERIODICA FALLITA
    it('TEST 2: dovrebbe lanciare LollipopAssertionException per INVALID_ASSERTION_PERIOD', async () => {
        // Simula il fallimento della validazione del periodo
        mockRequestValidation.validateAssertionPeriod.resolves(false);

        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('L\'asserzione avrebbe dovuto lanciare un errore.'); 
        } catch (error) {
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD);
        }
    });	
	
// TEST 3: VALIDAZIONE FIRMA FALLITA
    it('TEST 3: dovrebbe lanciare LollipopAssertionException per INVALID_SIGNATURE', async () => {
        mockRequestValidation.validateSignatureAssertion.resolves(false);

        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('La validazione della firma avrebbe dovuto fallire.'); 
        } catch (error) {
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_SIGNATURE);
            expect(mockRequestValidation.validateFullNameHeader.notCalled);
        }
    });

// TEST 4: ERRORE NELL'ESTRAZIONE INIZIALE (getAssertionDoc)
    it('TEST 4: dovrebbe lanciare immediatamente l\'errore se getAssertionDoc fallisce', async () => {
        mockRequestValidation.getAssertionDoc.rejects(
            new LollipopAssertionException('MOCK_JWT_ERR', "JWT non valido")
        );

        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('L\'estrazione dell\'asserzione avrebbe dovuto fallire.'); 
        } catch (error) {
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.errorCode).to.equal('MOCK_JWT_ERR');
            expect(mockRequestValidation.validateAssertionPeriod.notCalled);
        }
    });
});
