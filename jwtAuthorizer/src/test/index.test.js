const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const fs = require('fs')
const AWSXRay = require('aws-xray-sdk-core');
const iamPolicyGen = require("../app/iamPolicyGen");
AWSXRay.setContextMissingStrategy('LOG_ERROR')

var ValidationException = require('../app/exception/validationException.js');

let tokenPayload = {
  email: 'raoul87@libero.it',
  family_name: 'Galli',
  fiscal_number: 'GLLMRA77M43A332O',
  name: 'Mauro',
  from_aa: false,
  uid: '12e3c5a8-065b-411f-a364-f18d66242e4f',
  level: 'L2',
  iat: 1643643277,
  exp: 4073628800,
  iss: 'api.selfcare.pagopa.it',
  jti: '0297ca9e-4aec-44b3-83ad-00ab94b4ee87',
  aud: 'www.beta.pn.pagopa.it',
  organization: {
    id: 'c_h282',
    role: 'referente amministrativo',
    fiscal_code: '00100700574'
  },
  desired_exp: 1643646870
}

const validatorMock = {
  validation: function(params) {
    return tokenPayload;
  }
}

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./validation.js": validatorMock,
  "./iamPolicyGenerator.js": iamPolicyGen,
  "./exception/validationException.js": ValidationException,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});


describe("Success", function () {
  let eventFile = fs.readFileSync('event.json')
  let event = JSON.parse(eventFile)
  
  it("with IAM Policy", function (done) {        
    lambdaTester( lambda.handler )
    .event( event )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);    
      expect(result.principalId).to.equal('user');
      let statement = result.policyDocument.Statement;
      console.debug('statement ', statement);
      expect(statement[0].Action).to.equal('execute-api:Invoke');
      expect(statement[0].Effect).to.equal('Allow');
      done();
    }).catch(done); // Catch assertion errors
  });
});

