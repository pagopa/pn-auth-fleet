const expect = require("chai").expect;
const lambdaTester = require("lambda-tester");
const proxyquire = require("proxyquire");
const fs = require('fs')
const iamPolicyGen = require("../app/iamPolicyGen");

const ValidationException = require('../app/exception/validationException.js');

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

const AWS = require('aws-sdk-mock');
AWS.mock('KMS', 'getPublicKey', function (params, callback) {
    callback(null, {PublicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB" });
});
const validator = require("../app/validation.js");

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./validation.js": validator,
  "./iamPolicyGenerator.js": iamPolicyGen,
  "./exception/validationException.js": ValidationException,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});


describe("JWT Ok from spid-hub with cx_id verify", function () {
  let eventFile = fs.readFileSync('event.json')
  let events = JSON.parse(eventFile)
  
  it("with IAM Policy", function (done) {        
    lambdaTester( lambda.handler )
    .event( events[1] )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);
      let uid = result.context.uid;
      expect(result.context.cx_id).to.equal('PF-'+ uid);
      done();
    }).catch(done); // Catch assertion errors
  });
});

describe("JWT Ok from spid-hub Using cache", function () {
  let eventFile = fs.readFileSync('event.json')
  let events = JSON.parse(eventFile)
  
  it("with IAM Policy", function (done) {        
    lambdaTester( lambda.handler )
    .event( events[2] )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);
      done();
    }).catch(done); // Catch assertion errors
  });
});

describe("JWT expired from spid-hub", function () {
  let eventFile = fs.readFileSync('event.json')
  let events = JSON.parse(eventFile)
  
  it("with IAM Policy", function (done) {        
    lambdaTester( lambda.handler )
    .event( events[0] )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);
      done();
    }).catch(done); // Catch assertion errors
  });
});

