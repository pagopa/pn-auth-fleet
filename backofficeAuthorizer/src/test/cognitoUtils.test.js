const { mockClient } = require("aws-sdk-client-mock");
const { CognitoIdentityProviderClient, GetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { expect } = require('chai');
const { getCognitoUserAttributes, verifyAccessToken } = require('../app/cognitoUtils');
const sinon = require('sinon');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const ddbMock = mockClient(CognitoIdentityProviderClient);

describe('cognito tests', function() {
  this.beforeAll(() => {
    ddbMock.reset();
  })

  it("test cognito get user tag", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    ddbMock.on(GetUserCommand).resolves({
        UserAttributes: [
            {
                Name: 'custom:boo',
                Value: 'TEST'
            },
            {
                Name: 'custom:backoffice_tags',
                Value: 'tag1, tag2'
            }
        ]
    });

    const accessToken = 'token'
    const tags = await getCognitoUserAttributes(accessToken);

    expect(tags).deep.equal([
        'tag1', 'tag2'
    ]);
  });

  it("test cognito get user tag empty", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    ddbMock.on(GetUserCommand).resolves({
        UserAttributes: [
            {
                Name: 'custom:boo',
                Value: 'TEST'
            }
        ]
    });

    const accessToken = 'token'
    const tags = await getCognitoUserAttributes(accessToken);

    expect(tags).deep.equal([]);
  });

  it("test cognito get user tag empty", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    ddbMock.on(GetUserCommand).rejects(new Error('TEST ERROR'));

    const accessToken = 'token'
    try {
        const tags = await getCognitoUserAttributes(accessToken);
    } catch(error){
        expect(error).to.not.be.null;
        expect(error).to.not.be.undefined;
        expect(error.message).to.equal('TEST ERROR');
    }
  });

});

describe('jwt verifier', function() {

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });

  it("test jwt verifier", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    process.env.CLIENT_ID = '123131312132'
    
    sandbox.stub(CognitoJwtVerifier.prototype, 'verify').resolves({
        jit: '123123'
    });

    const accessToken = 'token'
    const valid = await verifyAccessToken(accessToken);
    expect(valid).equals(true);
  });

  it("test jwt verifier when the USER_POOL_ARN is missing", async () => {
    process.env.CLIENT_ID = '123131312132'
    delete process.env.USER_POOL_ARN

    sandbox.stub(CognitoJwtVerifier.prototype, 'verify').resolves({
        jit: '123123'
    });

    const accessToken = 'token'
    const valid = await verifyAccessToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the CLIENT_ID is missing", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    delete process.env.CLIENT_ID

    sandbox.stub(CognitoJwtVerifier.prototype, 'verify').resolves({
        jit: '123123'
    });

    const accessToken = 'token'
    const valid = await verifyAccessToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the userpool is not valid", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool'
    process.env.CLIENT_ID = '123131312132'

    sandbox.stub(CognitoJwtVerifier.prototype, 'verify').resolves({
        jit: '123123'
    });

    const accessToken = 'token'
    const valid = await verifyAccessToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when it triggers exception", async () => {
    process.env.USER_POOL_ARN = 'arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd'
    process.env.CLIENT_ID = '123131312132'

    sandbox.stub(CognitoJwtVerifier.prototype, 'verify').rejects(new Error('AAA'));

    const accessToken = 'token'
    const valid = await verifyAccessToken(accessToken);
    expect(valid).equals(false);
  });

})

