///npm install --save-dev mocha chai sinon
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');
const { expect } = chai;
chai.use(sinonChai);

const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const CommandResult = require('../app/model/CommandResult');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');

const CommandResult = class {
    constructor() {
        this.resultCode = null;
        this.resultMessage = null;
        this.name = null;
        this.familyName = null;
    }
};

const mockRequestValidation = {
    getAssertionDoc: sinon.stub(),
    validateAssertionPeriod: sinon.stub(),
    validateUserId: sinon.stub(),
    validateInResponseTo: sinon.stub(),
    getIdpCertData: sinon.stub(),
    validateSignature: sinon.stub(),
    validateFullNameHeader: sinon.stub(),
};

// Funzione helper per simulare il successo di tutte le validazioni critiche
const setupSuccessfulMocks = (stubs) => {
    stubs.getAssertionDoc.resolves({ /* doc */ });   /// ???
    stubs.getIdpCertData.resolves([]);            /// ???
    stubs.validateAssertionPeriod.resolves(true);
    stubs.validateUserId.resolves(true);
    stubs.validateInResponseTo.resolves(true);
    stubs.validateSignature.resolves(true);
    stubs.validateFullNameHeader.resolves({ name: 'Mario', familyName: 'Rossi' });
};

// Carica la funzione da testare sostituendo le sue dipendenze con i nostri stub di sinon
const { validateLollipopAssertion } = proxyquire('../lollipopAssertionValidation', {
    './assertionValidation': mockRequestValidation,
    './CommandResult': CommandResult,
    '../app/config/lollipopConsumerRequestConfig': { lollipopConfig },
    '../app/constants/lollipopErrorsConstants': { VALIDATION_ERROR_CODES },
    '../app/exception/lollipopAssertionException': LollipopAssertionException,
});


describe('TEST validateLollipopAssertion', () => {
    // Prima di ogni test, resettiamo il comportamento dei mock (stub)
    beforeEach(() => {
        sinon.reset(); 
        setupSuccessfulMocks(mockRequestValidation);
    });

    // TEST 1: SCENARIO DI SUCCESSO COMPLETO
    it('TEST 1: dovrebbe completare tutte le validazioni e restituire CommandResult 200', async () => {
        const result = await validateLollipopAssertion(mockRequest);

        // 1. Verifica che tutte le chiamate critiche siano avvenute
        expect(mockRequestValidation.getAssertionDoc.calledOnce).to.be.true;
        expect(mockRequestValidation.validateSignature.calledOnce).to.be.true;
        
        // 2. Verifica che il risultato sia popolato correttamente
        expect(result).to.be.an.instanceOf(CommandResult);
        expect(result.resultCode).to.equal(200);
        expect(result.name).to.equal('Mario');
    });
	
	// TEST 2: VALIDAZIONE PERIODICA FALLITA (ERRORE CRITICO)
    it('TEST 2: dovrebbe lanciare LollipopAssertionException per INVALID_ASSERTION_PERIOD', async () => {
        // Simula il fallimento della validazione del periodo
        mockRequestValidation.validateAssertionPeriod.resolves(false);

        try {
            await validateLollipopAssertion(mockRequest);
            // Se arriviamo qui, il test fallisce perché l'errore non è stato lanciato
            expect.fail('L\'asserzione avrebbe dovuto lanciare un errore.'); 
        } catch (error) {
            // Verifica che l'eccezione sia stata lanciata
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            // Verifica che il codice di errore sia corretto
            expect(error.code).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD);
        }
    });	
	
	
// TEST 3: VALIDAZIONE FIRMA FALLITA (ERRORE CRITICO)
    it('TEST 3: dovrebbe lanciare LollipopAssertionException per INVALID_SIGNATURE', async () => {
        // Simula il fallimento della firma
        mockRequestValidation.validateSignature.resolves(false);

        // Utilizziamo expect(promise).to.be.rejectedWith() per una sintassi più pulita con Chai-as-Promised
        // Se non usi Chai-as-Promised, usa try/catch come sopra:
        
        try {
            await validateLollipopAssertion(mockRequest);
            expect.fail('La validazione della firma avrebbe dovuto fallire.'); 
        } catch (error) {
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.code).to.equal(VALIDATION_ERROR_CODES.INVALID_SIGNATURE);
            // Verifica che validateFullNameHeader non sia stata chiamata
            expect(mockRequestValidation.validateFullNameHeader.notCalled).to.be.true;
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
            expect(error).to.be.an.instanceOf(LollipopAssertionException);
            expect(error.code).to.equal('MOCK_JWT_ERR');
            // Nessuna delle funzioni di validazione dovrebbe essere stata chiamata
            expect(mockRequestValidation.validateAssertionPeriod.notCalled).to.be.true;
        }
    });
});	