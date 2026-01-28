import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import esmock from "esmock";
const { expect } = chai;
chai.use(sinonChai);

import { VALIDATION_ERROR_CODES, VERIFY_HTTP_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import { EC_JWK, RSA_JWK, PUBLIC_KEY_HEADER, VALIDATION_PARAMS  } from "../test/constants/lollipopConstantsTest.js";
import CommandResult from "../app/model/CommandResult.js";
import LollipopRequestContentValidationException from "../app/exception/lollipopRequestContentValidationException.js";
import LollipopHttpSignatureValidationException from "../app/exception/lollipopHttpSignatureValidationException.js";
import { lollipopConfig  } from "../app/config/lollipopConsumerRequestConfig.js";

describe('validateLollipopHttpSignature - Test Suite', () => {

    let validateLollipopHttpSignature;
    let verifyHttpSignatureStub;
    let mockRequest;

    beforeEach(async () => {
        // Stub per la funzione di verifica della firma HTTP
        verifyHttpSignatureStub = sinon.stub();

        // Mock della configurazione degli header
        const mockConfig = {
            lollipopConfig: {
                signatureInputHeader: 'x-pagopa-lollipop-signature-input',
                signatureHeader: 'x-pagopa-lollipop-signature'
            }
        };

        // Carichiamo il modulo iniettando i mock tramite esmock
        const module = await esmock('../app/lollipopHttpSignatureValidation.js', {
            '../app/verifyHttpSignature.js': { verifyHttpSignature: verifyHttpSignatureStub },
            '../app/model/CommandResult.js': { default: CommandResult },
            '../app/config/lollipopConsumerRequestConfig.js': mockConfig,
            '../app/constants/lollipopErrorsConstants.js': { VERIFY_HTTP_ERROR_CODES },
            '../app/exception/lollipopRequestContentValidationException.js': { default: LollipopRequestContentValidationException },
            '../app/exception/lollipopHttpSignatureValidationException.js': { default: LollipopHttpSignatureValidationException },
        });
        validateLollipopHttpSignature = module.validateLollipopHttpSignature;

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
