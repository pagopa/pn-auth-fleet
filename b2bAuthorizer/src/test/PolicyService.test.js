// PolicyService test


const { expect } = require('chai');

const PolicyService = require('../app/modules/policy');
const Logger = require('../app/modules/logger');

const policyService = new PolicyService(new Logger());

describe('PolicyService', () => {

    it('should return a deny policy if intended usage mismatch', () => {
        const policy = policyService.generatePolicyDocument({ sourceChannel: 'RADD' }, { stageVariables: { IntendedUsage: 'B2B' } });

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

    it('should return a deny policy if intended usage is missing', () => {
        const policy = policyService.generatePolicyDocument({ sourceChannel: 'RADD' }, { stageVariables: { } });

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

    it('should return a deny policy if intended usage is missing in context', () => {
        const policy = policyService.generatePolicyDocument({  }, { stageVariables: { IntendedUsage: 'RADD' } });

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

    it('should return a deny policy if roles mismatch', () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user'],
            applicationRole: 'admin'
        }
        const policy = policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

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

    it('should return a deny policy if allowedApplicationRoles is missing', () => {
        const ctx = {
            sourceChannel: 'RADD',
            applicationRole: 'admin'
        }
        const policy = policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

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

    it('should return a deny policy if applicationRole is missing', () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user']
        }
        const policy = policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

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

    it('should return a allow policy', () => {
        const ctx = {
            sourceChannel: 'RADD',
            allowedApplicationRoles: [ 'user', 'admin'],
            applicationRole: 'user'
        }
        const policy = policyService.generatePolicyDocument(ctx, { stageVariables: { IntendedUsage: 'RADD' } });

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
});