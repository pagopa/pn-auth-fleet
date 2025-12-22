const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');
const { expect } = chai;
chai.use(sinonChai);

const { VALIDATION_ERROR_CODES, VERIFY_HTTP_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const { EC_JWK, RSA_JWK, PUBLIC_KEY_HEADER, VALIDATION_PARAMS } = require('../test/constants/lollipopConstantsTest');
const CommandResult = require('../app/model/CommandResult');
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const LollipopHttpSignatureValidationException = require('../app/exception/lollipopHttpSignatureValidationException');
const { lollipopConfig } = require('../app/config/lollipopConsumerRequestConfig');
const { validateLollipopHttpSignature } = require("../app/lollipopHttpSignatureValidation");

describe('validateLollipopHttpSignature - Test Suite', () => {

    let validateLollipopHttpSignature;
    let verifyHttpSignatureStub;
    let mockRequest;

    beforeEach(() => {
        // Stub per la funzione di verifica della firma HTTP
        verifyHttpSignatureStub = sinon.stub();

        // Mock della configurazione degli header
        const mockConfig = {
            lollipopConfig: {
                signatureInputHeader: 'x-pagopa-lollipop-signature-input',
                signatureHeader: 'x-pagopa-lollipop-signature'
            }
        };

        // 3. Carichiamo il modulo iniettando i mock tramite proxyquire
        validateLollipopHttpSignature = proxyquire('../app/lollipopHttpSignatureValidation', {
            './verifyHttpSignature': { verifyHttpSignature: verifyHttpSignatureStub },
            '../app/model/CommandResult': CommandResult,
            '../app/config/lollipopConsumerRequestConfig': mockConfig,
            '../app/constants/lollipopErrorsConstants': { VERIFY_HTTP_ERROR_CODES },
            '../app/exception/lollipopRequestContentValidationException': LollipopRequestContentValidationException,
            '../app/exception/lollipopHttpSignatureValidationException': LollipopHttpSignatureValidationException,
        }).validateLollipopHttpSignature;

        // richiesta fittizia
        mockRequest = {
            headerParams: {
                headers: {
                    'x-pagopa-lollipop-signature-input': 'sig-input-data',
                    'x-pagopa-lollipop-signature': 'sig-data'
                }
            }
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    // TEST 1: SUCCESSO
    it('TEST 1: dovrebbe restituire un CommandResult di successo quando la firma è valida', async () => {
        verifyHttpSignatureStub.resolves(true);

        const result = await validateLollipopHttpSignature(mockRequest);

        expect(result.resultCode).to.equal("HTTP_MESSAGE_VALIDATION_SUCCESS");
        expect(result.resultMessage).to.equal("HTTP message validated successfully");

        // Verifica che verifyHttpSignature sia stata chiamata con i parametri corretti
        expect(verifyHttpSignatureStub).to.have.been.calledWith(
            'sig-data',
            'sig-input-data',
            mockRequest.headerParams.headers
        );
    });

    // TEST 2: FIRMA NON VALIDA
    it('TEST 2 :dovrebbe restituire un CommandResult di fallimento quando la firma non è valida', async () => {
        verifyHttpSignatureStub.resolves(false);

        const result = await validateLollipopHttpSignature(mockRequest);

        expect(result.resultCode).to.equal("HTTP_MESSAGE_VALIDATION_FAILED");
        expect(result.resultMessage).to.contain("authentication failed");
    });

    // TEST 3: ERRORE GENERICO (Eccezione imprevista)
    it('TEST 3: dovrebbe lanciare LollipopHttpSignatureValidationException in caso di errore interno del modulo verify', async () => {
        const errorMsg = "Crypto internal error";
        verifyHttpSignatureStub.rejects(new Error(errorMsg));

        try {
            await validateLollipopHttpSignature(mockRequest);
            expect.fail("Il test avrebbe dovuto lanciare un'eccezione");
        } catch (error) {
            expect(error).to.be.instanceOf(LollipopHttpSignatureValidationException);
            expect(error.errorCode).to.equal(VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
            expect(error.message).to.equal(errorMsg);
        }
    });

    // TEST 4: RILANCIO ECCEZIONE ESISTENTE
    it('TEST 4: dovrebbe rilanciare correttamente un\'eccezione di tipo LollipopHttpSignatureValidationException', async () => {
        const customError = new LollipopHttpSignatureValidationException('SPECIFIC_ERR', 'Error detail');
        verifyHttpSignatureStub.rejects(customError);

        try {
            await validateLollipopHttpSignature(mockRequest);
            expect.fail("Il test avrebbe dovuto lanciare un'eccezione");
        } catch (error) {
            expect(error).to.be.instanceOf(LollipopHttpSignatureValidationException);
            expect(error.errorCode).to.equal('INVALID_SIGNATURE');
            expect(error.message).to.equal('Error detail');
        }
    });
});
