const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const iamPolicyGen = require("../app/iamPolicyGen");


const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
    "./iamPolicyGenerator.js": iamPolicyGen,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
    "./src/app/eventHandler.js": eventHandler,
});

describe( "Success", function () {
    let event = {
      "type": "REQUEST",
      "methodArn": "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
      "resource": "/request",
      "path": "/request",
      "httpMethod": "GET",
      "headers": {
          "x-pagopa-pn-uid": "123e4567-e89b-12d3-a456-426655440000"
      },
      "requestContext": {
        "path": "/request",
        "accountId": "123456789012",
        "resourceId": "05c7jb",
        "stage": "test",
        "requestId": "123456789123456789",
        "identity": {
          "apiKey": "123456789",
          }
      },
      "resourcePath": "/request",
      "apiId": "abcdef123"
    };
    
    it("with IAM Policy", function (done) {
        lambdaTester( lambda.handler )
        .event( event )
        .expectResult(( result ) => {
            console.debug('the result is ', result);
            let statement = result.policyDocument.Statement;
            console.debug('statement ', statement);
            expect(statement[0].Action).to.equal('execute-api:Invoke');
            expect(statement[0].Effect).to.equal('Allow');
            expect(result.context.cx_id).to.equal('SD-123e4567-e89b-12d3-a456-426655440000')
            expect(result.context.cx_type).to.equal('PF')
            expect(result.context.uid).to.equal('123e4567-e89b-12d3-a456-426655440000')
            done();
        }).catch(done);
    });
});

describe( "Error No UID", function () {
    let event = {
        "type": "REQUEST",
        "methodArn": 'arn:aws:execute-api:us-east-1:123456789012:swz6w548va/',
        "requestContext": {
            "identity": {
                "apiKey": "123456789"
            }
        }
    }

    it("Error Not taxId", function (done) {
        lambdaTester( lambda.handler )
        .event( event )
        .expectResult(( result ) => {
            console.debug('the result is ', result);
            done();
        }).catch(done);
    });

});