// PolicyService test
const { expect } = require('chai');
const sinon = require("sinon");

const PolicyService = require('../app/modules/policy');
const Logger = require('../app/modules/logger');
const customPolicy = require("../app/modules/policy/customPolicy.js");

const policyService = new PolicyService(new Logger());

before(() => {
    getCustomPolicyDocument = sinon.stub(
      customPolicy,
      "getCustomPolicyDocument"
    );
});
after(() => {
    sinon.restore();
});

describe('PolicyService', () => {

    it('should return a deny policy if intended usage mismatch',  async () =>  {
        const policy = await policyService.generatePolicyDocument({ sourceChannel: 'RADD' }, { stageVariables: { IntendedUsage: 'B2B' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a deny policy if intended usage is missing', async () => {
        const policy = await policyService.generatePolicyDocument({ sourceChannel: 'RADD' }, { stageVariables: { } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a deny policy if intended usage is missing in context', async () => {
        const policy = await policyService.generatePolicyDocument({  }, { stageVariables: { IntendedUsage: 'RADD' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a deny policy if roles mismatch', async () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user'],
            applicationRole: 'admin'
        }
        const policy = await policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a deny policy if allowedApplicationRoles is missing', async () => {
        const ctx = {
            sourceChannel: 'RADD',
            applicationRole: 'admin'
        }
        const policy = await policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a deny policy if applicationRole is missing', async () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user']
        }
        const policy = await policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return a allow policy', async () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user', 'admin'],
            applicationRole: 'user'
        }
        const policy = await policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

        expect(policy).to.deep.equal({
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: '*'
                }
            ]
        });
    });

    it('should return context for iam', async () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user', 'admin'],
            applicationRole: 'user'
        }
        const context = await policyService.normalizeContextForIAMPolicy(ctx);

        expect(context).to.deep.equal({
            sourceChannel: 'RADD',
            allowedApplicationRoles: "[\"user\",\"admin\"]",
            applicationRole: 'user'
        });
    });

    it('collable api tags', async () => {
        let policyDocument = {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: 'arn:aws:execute-api:region:account-id:api-id/stage/METHOD_HTTP_VERB/Resource-path'
                }
            ]
        };

        getCustomPolicyDocument.callsFake(() => Promise.resolve(policyDocument));

        const ctx = {
            sourceChannel: 'B2BPG', 
            allowedApplicationRoles: "[\"user\",\"admin\"]", //come saranno configurati nel nostro caso?
            applicationRole: 'user', //come saranno configurati nel nostro caso?
            callableApiTags: 'REFINEMENT'
        }
        const policy = await policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'B2BPG' } });

        expect(policy).to.deep.equal(policyDocument);

    });
});