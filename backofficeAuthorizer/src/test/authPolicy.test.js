const { expect } = require("chai");
const AuthPolicy = require('../app/authPolicy.js');

const principalId = '1231312'
const awsAccountId = '1231231232'
describe("Test auth policy", () => {
    it("no overlap because empty", () => {
        const apiOptions = {
            restApiId: '1231231',
            region: 'eu-south-1',
            stage: 'unique'
        }
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.denyMethod(event.httpMethod, event.path);
        const authResponse = policy.build();
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("rest api, region and stage empty", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.denyMethod(event.httpMethod, event.path);
        const authResponse = policy.build();
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("wrong method", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'XXXX',
            path: '/test'
        }
        try {
            policy.denyMethod(event.httpMethod, event.path);
        } catch(error){
            expect(error).to.not.be.null;
            expect(error).to.not.be.undefined;
            expect(error.message).to.equal('Invalid HTTP verb ' + event.httpMethod + ". Allowed verbs in AuthPolicy.HttpVerb");
        }
    });

    it("missing statements", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'XXXX',
            path: '/test'
        }
        try {
            policy.build();
        } catch(error){
            expect(error).to.not.be.null;
            expect(error).to.not.be.undefined;
            expect(error.message).to.equal("No statements defined for the policy");
        }
    });

    it("wrong path", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test#!"£!'
        }
        try {
            policy.denyMethod(event.httpMethod, event.path);
        } catch(error){
            expect(error).to.not.be.null;
            expect(error).to.not.be.undefined;
            expect(error.message).to.include('Invalid resource path: ' + event.path+'.');
        }
    });

    it("conditional allow", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.allowMethodWithConditions(event.httpMethod, event.path, ['cond1']);
        const authResponse = policy.build()
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
    });

    it("conditional deny", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.denyMethodWithConditions(event.httpMethod, event.path, ['cond1']);
        const authResponse = policy.build()
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("allow all methods", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.allowAllMethods(event.httpMethod, event.path);
        const authResponse = policy.build()
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
    });

    it("deny all methods", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.denyAllMethods(event.httpMethod, event.path);
        const authResponse = policy.build()
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Deny');
    });

    it("allow method", () => {
        const apiOptions = {}
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.allowMethod(event.httpMethod, event.path);
        const authResponse = policy.build()
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
    });
    
    it("context test", () => {
        const apiOptions = {
            restApiId: '1231231',
            region: 'eu-south-1',
            stage: 'unique'
        }
        let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        const event = {
            httpMethod: 'POST',
            path: '/test'
        }
        policy.allowMethod(event.httpMethod, event.path);
        let context = {
            "x-pagopa-pn-uid": '123456'
        }
        const authResponse = policy.build(context);
        expect(authResponse.policyDocument.Statement[0].Effect).equals('Allow');
        expect(authResponse.context).deep.eq(context);        
    });
})

