const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const fs = require('fs')
const AWSXRay = require('aws-xray-sdk-core');
const jsonwebtoken = require('jsonwebtoken');
const iamPolicyGen = require("../app/iamPolicyGen");
AWSXRay.setContextMissingStrategy('LOG_ERROR')

var ValidationException = require('../app/exception/validationException.js');

async function test () {
  let eventFile = fs.readFileSync('event.json')
  let event = JSON.parse(eventFile)
  let response = await index.handler(event, null)
  console.log('response ', response);  
}

const validator = proxyquire.noCallThru().load("../app/validation.js", {
  "jsonwebtoken": jsonwebtoken,
  "./exception/validationException.js": ValidationException,
});

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./validation.js": validator,
  "./iamPolicyGenerator.js": iamPolicyGen,
  "./exception/validationException.js": ValidationException,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});

describe("Expired token", function () {
  let eventFile = fs.readFileSync('event.json')
  let event = JSON.parse(eventFile)
  
  it("with code = 400", function (done) {        
    lambdaTester( lambda.handler )
    .event( event )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);    
      //expect(result.statusCode).to.equal(200);
      //const body = JSON.parse(result.body);
      //expect(body.name).to.equal(name);
      //expect(body.family_name).to.equal(family_name);
      //expect(body.fiscal_number).to.equal(fiscal_number);
      //expect(body.error).to.exist;
      done();
    }).catch(done); // Catch assertion errors
  });
});

