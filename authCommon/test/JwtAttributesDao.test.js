const rewire = require('rewire');
const { ATTR_PREFIX } = require('../app/modules/dao/constants');
const JwtAttributesDao = rewire("../app/modules/dao/JwtAttributesDao");
const fs = require('fs')
const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

process.env.AUTH_JWT_ATTRIBUTE_TABLE = "AUTH_JWT_ATTRIBUTE_TABLE"

const sinon = require('sinon');

describe('putJwtAttributes', () => {
  let item;

  beforeEach(() => {
    item = { pk: 'test-pk', someAttribute: 'someValue' };
  });

  it('succeeds when valid item is provided', async () => {
    sinon.stub(ddbDocClient, 'send').resolves();

    await putJwtAttributes(item);

    expect(ddbDocClient.send.calledOnce).to.be.true;
    expect(ddbDocClient.send.firstCall.args[0]).to.be.instanceOf(PutCommand);
    expect(ddbDocClient.send.firstCall.args[0].input.Item).to.deep.equal(item);
  });

  it('logs success message when item is put successfully', async () => {
    const consoleInfoStub = sinon.stub(console, 'info');
    sinon.stub(ddbDocClient, 'send').resolves();

    await putJwtAttributes(item);

    expect(consoleInfoStub.calledOnceWith("PutItem succeeded:", item.pk)).to.be.true;
  });

  it('throws an error when ddbDocClient.send fails', async () => {
    const error = new Error('DynamoDB error');
    sinon.stub(ddbDocClient, 'send').rejects(error);

    try {
      await putJwtAttributes(item);
    } catch (err) {
      expect(err).to.equal(error);
    }
  });

  it('logs error message when ddbDocClient.send fails', async () => {
    const error = new Error('DynamoDB error');
    const consoleErrorStub = sinon.stub(console, 'error');
    sinon.stub(ddbDocClient, 'send').rejects(error);

    try {
      await putJwtAttributes(item);
    } catch (err) {
      // expected error
    }

    expect(consoleErrorStub.calledOnceWith("Unable to putItem " + item.pk + ". Error JSON:", JSON.stringify(error, null, 2))).to.be.true;
  });

  afterEach(() => {
    sinon.restore();
  });
});

describe('AllowedIssuerDAO Testing', () => {
    beforeEach(() => {
        ddbMock.reset();
    });
    it('buildHashKeyForAttributeResolver', () => {
        const buildHashKeyForAttributeResolver = JwtAttributesDao.__get__('buildHashKeyForAttributeResolver');
        const jwt = fs.readFileSync('test/resources/jwt.json')
        const attrResolverCfg = {
            "keyAttributeName": "kid"
        }
        const result = buildHashKeyForAttributeResolver(jwt, attrResolverCfg);
        expect(result).to.equal(ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwt[ attrResolverCfg.keyAttributeName ]);
    });

    it('listJwtAttributes without errors', async () => {
        let item = JSON.parse(fs.readFileSync('test/resources/jwtAttributes.json'))
        item.cacheMaxUsageEpochSec = Math.round(Date.now()/1000) + 600

        ddbMock.on(GetCommand).resolves({
            Item: item
        });
        const jwt = fs.readFileSync('test/resources/jwt.json')
        const attrResolverCfg = {
                "keyAttributeName": "iss"
            }
        const listJwtAttributes = JwtAttributesDao.__get__('listJwtAttributes');
        
        const result = await listJwtAttributes(jwt, attrResolverCfg);     
        expect(result.hashkey).equal(item.hashkey);
    });

    it('listJwtAttributes with cacheMaxUsageEpochSec > now', async () => {
        let item = JSON.parse(fs.readFileSync('test/resources/jwtAttributes.json'));
        ddbMock.on(GetCommand).resolves({
            Item: item
        });
        const jwt = fs.readFileSync('test/resources/jwt.json')
        const attrResolverCfg = {
                "keyAttributeName": "kid"
            }
        const listJwtAttributes = JwtAttributesDao.__get__('listJwtAttributes');
        
        const result = await listJwtAttributes(jwt, attrResolverCfg);     

        expect(result).is.null;
    });

});
