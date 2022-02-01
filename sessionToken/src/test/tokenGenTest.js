const expect = require("chai").expect;

const AWS = require('aws-sdk-mock');
AWS.mock('KMS', 'sign', function (params, callback) {
    callback(null, {Signature:'signature'});
});

const tokenGen = require('../app/tokenGen.js')

let decodedToken = {
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
  };

tokenGen.generateToken(decodedToken);