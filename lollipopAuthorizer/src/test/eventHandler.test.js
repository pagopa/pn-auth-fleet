import chai from "chai";
import sinon from "sinon";
import esmock from "esmock";

const { expect } = chai;

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
            '../app/eventHandler.js',
            {
                '../app/lollipopAuthorizerValidation.js': {
                    validateLollipopAuthorizer: stubs.validateLollipopAuthorizer
                },
                '../app/iamPolicyGen.js': {
                    generateIAMPolicy: stubs.generateIAMPolicy
                },
                '../app/dataVaultClient.js': {
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
            headers: { 'x-pagopa-cx-taxid': 'TAX12345', 'x-pagopa-lollipop-user-id': 'TAX12345' }
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
            headers: { 'x-pagopa-cx-taxid': 'TAX12345', 'x-pagopa-lollipop-user-id': 'TAX12345' }
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
            headers: { 'x-pagopa-cx-taxid': 'TAX12345', 'x-pagopa-lollipop-user-id': 'TAX12345' }
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
                headers: { 'x-pagopa-cx-taxid': 'TAX12345', 'x-pagopa-lollipop-user-id': 'TAX12345' }
            };

            const mockLollipopResult = { statusCode: 200, resultCode: 'SUCCESS' };

            stubs.validateLollipopAuthorizer.resolves(mockLollipopResult);
            stubs.getCxId.resolves('CX-ID-999');
            stubs.generateIAMPolicy.rejects(new Error('IAM Policy generation error'));

            const result = await handleEvent(mockEvent);

            expect(result).to.deep.equal(defaultDenyAllPolicy);
        });

    // TEST 5: ERRORE IMPREVISTO (CATCH) ---
    it('TEST 5: dovrebbe restituire DENY in caso di eccezione imprevista', async () => {
        process.env.LOLLIPOP_BLOCK = "true";
        const mockEvent = { headers: { 'x-pagopa-cx-taxid': 'TAX' } };
        //stubs.validateLollipopAuthorizer.rejects(new Error('Database Error'));
        stubs.validateLollipopAuthorizer.resolves({ statusCode: 500 });
        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        delete process.env.LOLLIPOP_BLOCK;
    });

    // TEST 6: TAXID FACOLTATIVO (PN-19126)
    it('dovrebbe restituire una policy ALLOW quando taxId è assente ma userId è presente', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-lollipop-user-id': 'TAX12345' }
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
    });

    // TEST 7: USERID OBBLIGATORIO (PN-19126)
    it("dovrebbe restituire una policy DENY quando l'header 'x-pagopa-lollipop-user-id' è assente", async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345' }
        };

        stubs.validateLollipopAuthorizer.resolves({ statusCode: 200, resultCode: 'SUCCESS' });

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.getCxId.called).to.be.false;
        expect(stubs.generateIAMPolicy.called).to.be.false;
    });

    // TEST 8: MISMATCH TAXID/USERID (PN-19126)
    it('dovrebbe restituire una policy DENY quando taxId e userId non coincidono', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'TAX12345', 'x-pagopa-lollipop-user-id': 'OTHER999' }
        };

        stubs.validateLollipopAuthorizer.resolves({ statusCode: 200, resultCode: 'SUCCESS' });

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(defaultDenyAllPolicy);
        expect(stubs.getCxId.called).to.be.false;
        expect(stubs.generateIAMPolicy.called).to.be.false;
    });

    // TEST 9: MATCH CASE-INSENSITIVE TAXID/USERID (PN-19126)
    it('dovrebbe restituire una policy ALLOW quando taxId e userId coincidono con case diverso', async () => {
        const mockEvent = {
            methodArn: 'arn:aws:execute-api:region:account:api/stage/GET/path',
            headers: { 'x-pagopa-cx-taxid': 'tax12345', 'x-pagopa-lollipop-user-id': 'TAX12345' }
        };

        const mockLollipopResult = { statusCode: 200, resultCode: 'SUCCESS' };
        const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };

        stubs.validateLollipopAuthorizer.resolves(mockLollipopResult);
        stubs.getCxId.resolves('CX-ID-999');
        stubs.generateIAMPolicy.resolves(mockPolicy);

        const result = await handleEvent(mockEvent);

        expect(result).to.deep.equal(mockPolicy);
        expect(stubs.getCxId.calledWith('TAX12345')).to.be.true;
    });

    describe('effectiveBlock - override per-URL', () => {
        let handleEventWithConfig;
        let stubsWithConfig;

        beforeEach(async () => {
            stubsWithConfig = {
                validateLollipopAuthorizer: sinon.stub(),
                generateIAMPolicy: sinon.stub(),
                getCxId: sinon.stub(),
                findMicroserviceConfig: sinon.stub()
            };

            const module = await esmock(
                '../app/eventHandler.js',
                {
                    '../app/lollipopAuthorizerValidation.js': {
                        validateLollipopAuthorizer: stubsWithConfig.validateLollipopAuthorizer
                    },
                    '../app/iamPolicyGen.js': {
                        generateIAMPolicy: stubsWithConfig.generateIAMPolicy
                    },
                    '../app/dataVaultClient.js': {
                        getCxId: stubsWithConfig.getCxId
                    },
                    '../app/requestValidation.js': {
                        findMicroserviceConfig: stubsWithConfig.findMicroserviceConfig
                    }
                }
            );
            handleEventWithConfig = module.handleEvent;
        });

        afterEach(() => {
            sinon.restore();
            delete process.env.LOLLIPOP_BLOCK;
        });

        it('T-6: per-URL blocking true, globale false, validazione KO => DENY', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/io-connector/send',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns({ substringURL: '/io-connector/', methods: ['POST'], URLpattern: '.*', blocking: true });
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 400, resultCode: 'VALIDATION_ERROR' });

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(defaultDenyAllPolicy);
        });

        it('T-7: per-URL blocking false, globale true, validazione KO => ALLOW flow (pass)', async () => {
            process.env.LOLLIPOP_BLOCK = 'true';
            const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/delivery/send',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns({ substringURL: '/delivery/', methods: ['POST'], URLpattern: '.*', blocking: false });
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 400, resultCode: 'VALIDATION_ERROR' });
            stubsWithConfig.getCxId.resolves('CX-ID-123');
            stubsWithConfig.generateIAMPolicy.resolves(mockPolicy);

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(mockPolicy);
        });

        it('T-8: entry senza campo blocking, globale false, validazione KO => ALLOW flow (pass)', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/delivery/send',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns({ substringURL: '/delivery/', methods: ['POST'], URLpattern: '.*' });
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 400, resultCode: 'VALIDATION_ERROR' });
            stubsWithConfig.getCxId.resolves('CX-ID-123');
            stubsWithConfig.generateIAMPolicy.resolves(mockPolicy);

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(mockPolicy);
        });

        it('T-9: URL non in mappa (eccezione findMicroserviceConfig), globale false, validazione KO => ALLOW flow (pass)', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/unknown/endpoint',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.throws(new Error('MICROSERVICE_CONFIG_NOT_FOUND'));
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 400, resultCode: 'VALIDATION_ERROR' });
            stubsWithConfig.getCxId.resolves('CX-ID-123');
            stubsWithConfig.generateIAMPolicy.resolves(mockPolicy);

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(mockPolicy);
        });

        it('T-9b: mappa assente (findMicroserviceConfig restituisce null), globale false, validazione KO => ALLOW flow (pass)', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/unknown/endpoint',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns(null);
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 400, resultCode: 'VALIDATION_ERROR' });
            stubsWithConfig.getCxId.resolves('CX-ID-123');
            stubsWithConfig.generateIAMPolicy.resolves(mockPolicy);

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(mockPolicy);
        });

        it('T-10: per-URL blocking true, globale false, validazione OK => ALLOW', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockPolicy = { principalId: 'user', policyDocument: { Statement: [{ Effect: 'Allow' }] } };
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/io-connector/send',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns({ substringURL: '/io-connector/', methods: ['POST'], URLpattern: '.*', blocking: true });
            stubsWithConfig.validateLollipopAuthorizer.resolves({ statusCode: 200, resultCode: 'SUCCESS' });
            stubsWithConfig.getCxId.resolves('CX-ID-123');
            stubsWithConfig.generateIAMPolicy.resolves(mockPolicy);

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(mockPolicy);
        });

        it('T-11: per-URL blocking true, globale false, validateLollipopAuthorizer lancia eccezione => DENY', async () => {
            process.env.LOLLIPOP_BLOCK = 'false';
            const mockEvent = {
                methodArn: 'arn:aws:execute-api:region:account:api/stage/POST/path',
                path: '/api/v1/io-connector/send',
                headers: { 'x-pagopa-cx-taxid': 'RSSMRA85T10A562S', 'x-pagopa-lollipop-user-id': 'RSSMRA85T10A562S' }
            };
            stubsWithConfig.findMicroserviceConfig.returns({ substringURL: '/io-connector/', methods: ['POST'], URLpattern: '.*', blocking: true });
            stubsWithConfig.validateLollipopAuthorizer.rejects(new Error('Unexpected error'));

            const result = await handleEventWithConfig(mockEvent);

            expect(result).to.deep.equal(defaultDenyAllPolicy);
        });
    });

});