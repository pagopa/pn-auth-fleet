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
    callback(null, {PublicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwJUk0b4JfB3LKgq//1npQKt95cW43Xd9PlypW57YeMma+M4dWkbwA5n2w2YfYotZhnpxhW97UoPTNotGUgChVse+jogngtI7oBSIssuCv44qwVrrUMXrKRTESvhvSU0j5ntjXuQ3LC1x0cMM5tFgiXbIoGvBuxnQJZf01DK+BC7HaC7gmn3/p+Au7hGdUgao28J2j06LzFkez2eqa+Ll/Kiwwk/FeZHVLZZnfUoaSF/dejssjBW4p052ZEVzYRmre0EM74ZV9Wi0zDhsgrQvtZss96DxZij8Y368c8ABrVhWRX5qfSK7Z7YkwdL9+qCp5eNYrKmSpHp1FxLIZ9m/SQIDAQAB" });
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


describe("JWT Expired", function () {
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

describe("JWT Expired Using cache", function () {
  let eventFile = fs.readFileSync('event.json')
  let events = JSON.parse(eventFile)
  
  it("with IAM Policy", function (done) {        
    lambdaTester( lambda.handler )
    .event( events[1] )
    .expectResult((result) => {
      // Check if code exist
      console.debug('the result is ', result);
      done();
    }).catch(done); // Catch assertion errors
  });
});

