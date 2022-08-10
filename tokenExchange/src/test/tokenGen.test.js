const expect = require('chai').expect
const sinon = require('sinon');
const rewire = require('rewire');
const tokenGen = rewire('../app/tokenGen');

const tokenGenObject = { getSignature: tokenGen.__get__('getSignature'), getKeyId: tokenGen.__get__('getKeyId') };
const stubGetSignature = sinon
  .stub(tokenGenObject, 'getSignature')
  .returns({Signature:'signature'});
const stubGetKeyId = sinon
  .stub(tokenGenObject, 'getKeyId')
  .returns('keyId');
tokenGen.__set__('getSignature', stubGetSignature);
tokenGen.__set__('getKeyId', stubGetKeyId);

const decodedToken = {
  email: 'info@agid.gov.it',
  family_name: 'Rossi',
  fiscal_number: 'GDNNWA12H81Y874F',
  mobile_phone: '333333334',
  name: 'Mario',
  from_aa: false,
  uid: 'ed84b8c9-444e-410d-80d7-cfad6aa12070',
  level: 'L2',
  iat: 1649686749,
  exp: 1649690349,
  aud: 'portale-pf-develop.fe.dev.pn.pagopa.it',
  iss: 'https://spid-hub-test.dev.pn.pagopa.it',
  jti: '01G0CFW80HGTTW0RH54WQD6F6S',
  organization: {
    roles: [
      {
        role: 'admin',
        partyRole: 'MANAGER'
      }
    ]
  }
};

describe("test tokenGen", () => {

  it("test the token generation", async () => {
    const token = await tokenGen.generateToken(decodedToken);

    console.log("my token", decodedToken, token);
    expect(token).to.match(/.*\..*\.signature/i);
  })
})
