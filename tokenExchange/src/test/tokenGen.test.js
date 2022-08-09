const expect = require('chai').expect
const sinon = require('sinon');
const rewire = require('rewire');
const tokenGen = rewire('../app/tokenGen');

const tokenGenObject = { sign: tokenGen.__get__('sign'), getKeyId: tokenGen.__get__('getKeyId') };
const stubSign = sinon
  .stub(tokenGenObject, 'sign')
  .returns('token.token.token');
const stubGetKeyId = sinon
  .stub(tokenGenObject, 'getKeyId')
  .returns('keyId');
tokenGen.__set__('sign', stubSign);
tokenGen.__set__('getKeyId', stubGetKeyId);

const decodedToken = {
  header: { alg: 'RS512', typ: 'JWT', kid: 'hub-spid-login-test' },
  payload: {
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
    jti: '01G0CFW80HGTTW0RH54WQD6F6S'
  },
  signature: 'CRd7N1ceNzb-oh3Xk8uffUjS6PHKcO8-zf9WOOvVH8C4tH-8m92wTH02j1dH5Q3pObBbmiU-EE6-ClDycuoRqNgk1aj4O9HHzSVHMKVlHeSsfPyHtmEC9sr817poooCkYZ9FZ-3bVnzzrXtmlA_KiwA49zpJoJ-QnZmblJVm0e3tt0RQHfPxekgjQOmd_ZscidHIMQd1AsshJyM-SfuHQzpWRb9jixby264kf1TL8UtxfAe47ipOGqxA5Ds6R0PSk8gR3fcdSuolZOVwSlnR_Ojt3-vgTJEJ07GPywLMBQzIx1qKIDcRBtG_B1Xt5N0Zublcw_V92EZ957Y_XSLl5w'
};

describe("test tokenGen", () => {

  it("test the token generation", async () => {
    const token = await tokenGen.generateToken(decodedToken);

    console.log("my token", decodedToken, token);
    expect(token).to.eq('token.token.token')
  })
})
