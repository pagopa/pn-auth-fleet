const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const iamPolicyGen = require("../app/iamPolicyGen");
const keyTagsGetter = require("../app/keyTagsGetter");

const awsMockResult = {
    tags: {
        pa_id: 'fake_pa_id',
        cx_groups: 'foo,bar'
    }
}

const AWS = require('aws-sdk-mock');
AWS.mock('APIGateway', 'getTags', function (_params, callback) {
    callback(null, awsMockResult);
});


const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
    "./iamPolicyGenerator.js": iamPolicyGen,
    "./keyTagsGetter.js": keyTagsGetter,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
    "./src/app/eventHandler.js": eventHandler,
});

describe( "Success", function () {
    let event = {
        type: 'TOKEN',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:swz6w548va/beta/POST/delivery/notifications/sent',
        requestContext: {
            identity: {
                apiKeyId: '4dlrwkp7a8'
            }
        }
    }
    
    it("with IAM Policy", function (done) {
        lambdaTester( lambda.handler )
        .event( event )
        .expectResult(( result ) => {
            console.debug('the result is ', result);
            let statement = result.policyDocument.Statement;
            console.debug('statement ', statement);
            expect(statement[0].Action).to.equal('execute-api:Invoke');
            expect(statement[0].Effect).to.equal('Allow');
            expect(result.context.cx_id).to.equal('fake_pa_id')
            expect(result.context.cx_type).to.equal('PA')
            expect(result.context.uid).to.equal('APIKEY-4dlrwkp7a8')
            expect(result.context.cx_groups).to.equal('foo,bar')
            done();
        }).catch(done);
    });
});

describe( "Error", function () {
    let event = {
        type: 'TOKEN',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:swz6w548va/',
        requestContext: {
            identity: {
                apiKeyId: '4dlrwkp7a8'
            }
        }
    }

    it("Error method arn", function (done) {
        lambdaTester( lambda.handler )
        .event( event )
        .expectResult(( result ) => {
            console.debug('the result is ', result);
            done();
        }).catch(done);
    });

});
