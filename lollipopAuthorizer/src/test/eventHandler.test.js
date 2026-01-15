import chai from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const { expect } = chai;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('EventHandler - Test Suite', () => {
    let handleEvent;
    let stubs;

    const defaultDenyAllPolicy = {
        principalId: "user",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [{ Action: "execute-api:Invoke", Effect: "Deny", Resource: "*" }],
        },
    };

    beforeEach(async () => {
        stubs = {
            validateLollipopAuthorizer: sinon.stub(),
            generateIAMPolicy: sinon.stub(),
            getCxId: sinon.stub()
        };

        const module = await esmock(
            resolve(__dirname, '../app/eventHandler.js'),
            {
                [resolve(__dirname, '../app/lollipopAuthorizerValidation.js')]: {
                    validateLollipopAuthorizer: stubs.validateLollipopAuthorizer
                },
                [resolve(__dirname, '../app/iamPolicyGen.js')]: {
                    generateIAMPolicy: stubs.generateIAMPolicy
                },
                [resolve(__dirname, '../app/dataVaultClient.js')]: {
                    getCxId: stubs.getCxId
                }
            }
        );
        handleEvent = module.handleEvent;
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

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(mockPolicy);
        expect(stubs.getCxId.calledWith('TAX12345')).to.be.true;
        expect(stubs.generateIAMPolicy.calledWith(
            mockEvent.methodArn,
            sinon.match({
                name: 'Mario',
                familyName: 'Rossi',
                cxId: 'CX-ID-999'
            })
        )).to.be.true;
    });

    // TEST 2: VALIDATION FAILS
    it('dovrebbe restituire una policy DENY quando la validazione Lollipop fallisce', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345' }
        };

        stubs.validateLollipopAuthorizer.rejects(new Error('Validation failed'));
        stubs.getCxId.resolves(null);

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.getCxId.called).to.be.true;
        expect(stubs.generateIAMPolicy.called).to.be.false;
    });

    // TEST 3: GETCXID FAILS
    it('dovrebbe restituire una policy DENY quando getCxId fallisce', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345' }
        };

        const mockLollipopResult = { statusCode: 200, resultCode: 'SUCCESS' };

        stubs.validateLollipopAuthorizer.resolves(mockLollipopResult);
        stubs.getCxId.rejects(new Error('DataVault error'));

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.generateIAMPolicy.called).to.be.false;
    });

    // TEST 4: GENERATE IAM POLICY FAILS
    it('dovrebbe restituire una policy DENY quando generateIAMPolicy fallisce', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345' }
        };

        const mockLollipopResult = { statusCode: 200, resultCode: 'SUCCESS' };

        stubs.validateLollipopAuthorizer.resolves(mockLollipopResult);
        stubs.getCxId.resolves('CX-ID-999');
        stubs.generateIAMPolicy.rejects(new Error('IAM Policy generation error'));

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
    });
});