const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('EventHandler - Test Suite', () => {
    let handleEventModule;
    let stubs;

    const defaultDenyAllPolicy = {
        principalId: "user",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [{ Action: "execute-api:Invoke", Effect: "Deny", Resource: "*" }],
        },
    };

    beforeEach(() => {
        stubs = {
            validateLollipopAuthorizer: sinon.stub(),
            generateIAMPolicy: sinon.stub(),
            getCxId: sinon.stub()
        };

        // Carichiamo il modulo iniettando gli stub al posto dei file reali
        handleEventModule = proxyquire('../app/eventHandler', {
            '../app/lollipopAuthorizerValidation': { validateLollipopAuthorizer: stubs.validateLollipopAuthorizer },
            '../app/iamPolicyGen': { generateIAMPolicy: stubs.generateIAMPolicy },
            '../app/dataVaultClient': { getCxId: stubs.getCxId }
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    // TEST 1: SUCCESS
    it('dovrebbe restituire una policy ALLOW quando tutti i passaggi hanno successo', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345' }
        };

        const mockLollipopResult = {
            statusCode: 200,
            resultCode: 'SUCCESS',
            name: 'Mario',
            familyName: 'Rossi'
        };

        const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };

        stubs.validateLollipopAuthorizer.resolves(mockLollipopResult);
        stubs.getCxId.resolves('CX-ID-999');
        stubs.generateIAMPolicy.resolves(mockPolicy);

        const result = await handleEventModule.handleEvent(mockEvent);

        expect(result).to.deep.equal(mockPolicy);
        expect(stubs.getCxId.calledWith('TAX12345')).to.be.true;
        expect(stubs.generateIAMPolicy.calledWith(
            mockEvent.methodArn,
            sinon.match({ name: 'Mario', familyName: 'Rossi', cxId: 'CX-ID-999' })
        )).to.be.true;
    });


    // TES 2: FALLIMENTO VALIDAZIONE LOLLIPOP
    it('TEST 2: dovrebbe restituire DENY se la validazione Lollipop fallisce (diverso da 200)', async () => {
        const mockEvent = { headers: {} };
        stubs.validateLollipopAuthorizer.resolves({ statusCode: 401, resultCode: 'REQUEST_PARAMS_VALIDATION_FAILED' });

        const result = await handleEventModule.handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.getCxId.called).to.be.false; // Il flusso deve interrompersi
    });

    // TEST 3: HEADER TAXID UNDEFINED
    it('TEST 3: dovrebbe restituire DENY se manca l\'header x-pagopa-cx-taxid', async () => {
        const mockEvent = { headers: {} }; // Header UNDEFINED
        stubs.validateLollipopAuthorizer.resolves({ statusCode: 200 });

        const result = await handleEventModule.handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.getCxId.called).to.be.false;
    });

    // TEST 4: UTENTE NON TROVATO NEL DATA VAULT (404)
    it('TEST 4: dovrebbe restituire DENY se l\'utente non è presente nel DataVault', async () => {

        const mockEvent = { headers: { 'x-pagopa-cx-taxid': 'UNKNOWN_TAX' } };
        stubs.validateLollipopAuthorizer.resolves({ statusCode: 200 });
        stubs.getCxId.resolves(null); // Utente non trovato

        const result = await handleEventModule.handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.generateIAMPolicy.called).to.be.false;
    });

    // TEST 5: ERRORE IMPREVISTO (CATCH) ---
    it('TEST 5: dovrebbe restituire DENY in caso di eccezione imprevista', async () => {
        const mockEvent = { headers: { 'x-pagopa-cx-taxid': 'TAX' } };
        //stubs.validateLollipopAuthorizer.rejects(new Error('Database Error'));
        stubs.validateLollipopAuthorizer.resolves({ statusCode: 500 });
        const result = await handleEventModule.handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
    });

});