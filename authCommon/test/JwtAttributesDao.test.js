const rewire = require('rewire');
const { ATTR_PREFIX, RADD_RESOLVER_NAME } = require('../app/modules/dao/constants');
const JwtAttributesDao = rewire("../app/modules/dao/JwtAttributesDao");
const fs = require('fs')
const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

process.env.AUTH_JWT_ATTRIBUTE_TABLE = "AUTH_JWT_ATTRIBUTE_TABLE";

const sinon = require('sinon');

describe('putJwtAttributes', () => {
  let item;

  beforeEach(() => {
    item = { pk: 'test-pk', someAttribute: 'someValue' };
    ddbMock.reset();
  });

  it('succeeds when valid item is provided', async () => {
    //sinon.stub(ddbMock, 'send').resolves();
    ddbMock.on(PutCommand).resolves({});
    await JwtAttributesDao.putJwtAttributes(item);

    expect(ddbMock.send.calledOnce).to.be.true;
    expect(ddbMock.send.firstCall.args[0]).to.be.instanceOf(PutCommand);
    expect(ddbMock.send.firstCall.args[0].input.Item).to.deep.equal(item);
  });

  it('logs success message when item is put successfully', async () => {
    const consoleInfoStub = sinon.stub(console, 'info');
    ddbMock.on(PutCommand).resolves({});

    await JwtAttributesDao.putJwtAttributes(item);

    expect(consoleInfoStub.calledOnceWith("PutItem succeeded:", item.pk)).to.be.true;
  });

  it('throws an error when ddbDocClient.send fails', async () => {
    const error = new Error('DynamoDB error');
    ddbMock.on(PutCommand).rejects(error);

    try {
      await JwtAttributesDao.putJwtAttributes(item);
    } catch (err) {
      expect(err).to.equal(error);
    }
  });

  it('logs error message when ddbDocClient.send fails', async () => {

    const consoleErrorStub = sinon.stub(console, 'error');
    const error = new Error('DynamoDB error');
    ddbMock.on(PutCommand).rejects(error);

    try {
      await JwtAttributesDao.putJwtAttributes(item);
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
    expect(result).to.equal(ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwt[attrResolverCfg.keyAttributeName]);
  });

  it('listJwtAttributes without errors', async () => {
    let item = JSON.parse(fs.readFileSync('test/resources/jwtAttributes.json'))
    item.cacheMaxUsageEpochSec = Math.round(Date.now() / 1000) + 600

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


  it('listJwtAttributesByIssuer: issuer not found', async () => {
    ddbMock.on(GetCommand).resolves({
    });
    const jwt = fs.readFileSync('test/resources/jwt.json')

    const listJwtAttributesByIssuer = JwtAttributesDao.__get__('listJwtAttributesByIssuer');

    jwt.iss = "wrongISs";
    const result = await listJwtAttributesByIssuer(jwt, RADD_RESOLVER_NAME);

    expect(result).deep.equals({});
  });



  it('listJwtAttributesByIssuer: issuer  found', async () => {
    let item = JSON.parse(fs.readFileSync('test/resources/jwtAttributes.json'));
    ddbMock.on(GetCommand).resolves({
      Item: item
    });
    const jwt = fs.readFileSync('test/resources/jwt.json')

    const listJwtAttributesByIssuer = JwtAttributesDao.__get__('listJwtAttributesByIssuer');

    const result = await listJwtAttributesByIssuer(jwt, RADD_RESOLVER_NAME);

    expect(result).deep.not.equals({});
  });

  it('listJwtAttributesByIssuer: issuer found but no resolver matching', async () => {
    let item = JSON.parse(fs.readFileSync('test/resources/jwtAttributes.json'));
    ddbMock.on(GetCommand).resolves({
      Item: item
    });
    const jwt = fs.readFileSync('test/resources/jwt.json')

    const listJwtAttributesByIssuer = JwtAttributesDao.__get__('listJwtAttributesByIssuer');

    const result = await listJwtAttributesByIssuer(jwt, "WRONG_RESOLVER");

    expect(result).not.equals({});
  });

});
