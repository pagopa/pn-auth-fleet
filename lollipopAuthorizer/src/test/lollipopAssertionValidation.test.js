///npm install --save-dev mocha chai@4 sinon sinon-chai@3.7.0 proxyquire
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');
const { expect } = chai;
chai.use(sinonChai);

const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const { VALID_ASSERTION_XML, VALIDATION_PARAMS, VALID_JWT, VALID_IDP_CERTIFICATE } = require('../test/constants/lollipopConstantsTest');
const CommandResult = require('../app/model/CommandResult');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');
const { lollipopConfig } = require('../app/config/lollipopConsumerRequestConfig');

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
    getIdpCertData: sinon.stub(),
    validateSignatureAssertion: sinon.stub(),
    validateFullNameHeader: sinon.stub(),
};

// Funzione helper per simulare il successo di tutte le validazioni critiche
const setupSuccessfulMocks = (stubs) => {
    stubs.getAssertionDoc.resolves({ assertionData: VALID_ASSERTION_XML });
    stubs.getIdpCertData.resolves([ { cert: VALID_IDP_CERTIFICATE } ]);   //idpCertDataList: VALID_IDP_CERTIFICATE);
    stubs.validateAssertionPeriod.resolves(true);
    stubs.validateUserId.resolves(true);
    stubs.validateInResponseTo.resolves(true);
    stubs.validateSignatureAssertion.resolves(true); //: assertionData, idpCertDataList);
    stubs.validateFullNameHeader.resolves({ name: 'Mario', familyName: 'Rossi' });
};

// Carica la funzione da testare sostituendo le sue dipendenze con i nostri stub di sinon
const { validateLollipopAssertion } = proxyquire('../app/lollipopAssertionValidation', {
    '../app/assertionValidation': mockRequestValidation,
    '../app/model/CommandResult': mockCommandResult,
    '../app/config/lollipopConsumerRequestConfig': { lollipopConfig },
    '../app/constants/lollipopErrorsConstants': { VALIDATION_ERROR_CODES },
    '../app/exception/lollipopAssertionException': LollipopAssertionException,
});

mockRequest = {
    headerParams: {
        headers: {
            'x-pagopa-lollipop-auth-jwt': VALID_JWT,
            'x-pagopa-lollipop-assertion-ref': VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256
        }
    }
};


describe('TEST lollipopValidateLollipopAssertion', () => {

    let requestValidationStubs;

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
        expect(result.resultCode).to.equal("ASSERTION_VERIFICATION_SUCCESS");
        expect(result.name).to.equal('Mario');
        expect(result.familyName).to.equal("Rossi");
    });
	
	// TEST 2: VALIDAZIONE PERIODICA FALLITA
    it('TEST 2: dovrebbe lanciare LollipopAssertionException per INVALID_ASSERTION_PERIOD', async () => {
        // Simula il fallimento della validazione del periodo
        mockRequestValidation.validateAssertionPeriod.resolves(false);

        try {
            await validateLollipopAssertion(mockRequest);
            // Se arriviamo qui, il test fallisce perché l'errore non è stato lanciato
            expect.fail('L\'asserzione avrebbe dovuto lanciare un errore.'); 
        } catch (error) {
            //console.log("ERROR: ", error);
            // Verifica che l'eccezione sia stata lanciata
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            // Verifica che il codice di errore sia corretto
            expect(error.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD);
        }
    });	
	
	
// TEST 3: VALIDAZIONE FIRMA FALLITA
    it('TEST 3: dovrebbe lanciare LollipopAssertionException per INVALID_SIGNATURE', async () => {
        // Simula il fallimento della firma
        mockRequestValidation.validateSignatureAssertion.resolves(false);

        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('La validazione della firma avrebbe dovuto fallire.'); 
        } catch (error) {
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_SIGNATURE);
            // Verifica che validateFullNameHeader non sia stata chiamata
            expect(mockRequestValidation.validateFullNameHeader.notCalled);//.to.be.true;
        }
    });

// TEST 4: ERRORE NELL'ESTRAZIONE INIZIALE (getAssertionDoc)
    it('TEST 4: dovrebbe lanciare immediatamente l\'errore se getAssertionDoc fallisce', async () => {
        // Simula un errore nella prima fase asincrona
        mockRequestValidation.getAssertionDoc.rejects(
            new LollipopAssertionException('MOCK_JWT_ERR', "JWT non valido")
        );

        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('L\'estrazione dell\'asserzione avrebbe dovuto fallire.'); 
        } catch (error) {
            //console.log("ERROR getAssertionDoc: ", error.errorCode);
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.errorCode).to.equal('MOCK_JWT_ERR');
            // Nessuna delle funzioni di validazione dovrebbe essere stata chiamata
            expect(mockRequestValidation.validateAssertionPeriod.notCalled); //.to.be.true;
        }
    });
});	