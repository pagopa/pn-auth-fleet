const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const dynamoFunctions = require("../app/modules/middleware/dynamoFunctions");

const { AllowedIssuerDao, JwtAttributesDao } = require('pn-auth-common');
const PgCustomAttributeResolver = require('../app/modules/attributeResolvers/PgCustomAttributeResolver');
const { ItemNotFoundException, TooManyItemsFoundException } = require('../app/errors/exceptions');

process.env.ENABLE_PGCUSTOM_CACHE = 'true';
process.env.PG_CUSTOM_CACHE_MAX_USAGE_EPOCH_SEC = '10';

describe('PgCustomAttributeResolver', () => {
  let jwt, lambdaEvent, context, attrResolverCfg;

  beforeEach(() => {
    jwt = { jti: 'test-jti', iss: 'test-iss', virtual_key: 'test-virtual-key' };
    lambdaEvent = { stageVariables: { IntendedUsage: 'test-usage' } };
    context = {};
    attrResolverCfg = {};
  });

  it('resolves attributes and retrieve already configured context without checked consent', async () => {

    context["cx_jti"] = "test-jti@test-iss";
    context["sourceChannel"] = "test-usage";
    context["uid"] = "test-uid";
    context["cx_id"]= "test-iss";
    context["cx_type"] = "test-type";
    context["cx_role"] = "test-role";
    context["cx_groups"] = ["group1","group2"];
    context["callableApiTags"] = ["BASE","TEST"];
    context["applicationRole"] = ["DESTINATARIO-PG"];
    context["allowedApplicationRoles"] = ["DESTINATARIO-PG"];

    sinon.stub(axios, 'get').resolves({ data: { product: { productRole: 'test-role' }, version: 'test-version', accepted: false } });

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('User has not given consent to use the service');
    }
  });

  it('resolves attributes and retrieve already configured context', async () => {

    context["cx_jti"] = "test-jti@test-iss";
    context["sourceChannel"] = "test-usage";
    context["uid"] = "test-uid";
    context["cx_id"]= "test-iss";
    context["cx_type"] = "test-type";
    context["cx_role"] = "test-role";
    context["cx_groups"] = ["group1","group2"];
    context["callableApiTags"] = ["BASE","TEST"];
    context["applicationRole"] = ["DESTINATARIO-PG"];
    context["allowedApplicationRoles"] = ["DESTINATARIO-PG"];

    sinon.stub(axios, 'get').resolves({ data: { product: { productRole: 'test-role' }, version: 'test-version', accepted: true } });

    const result = await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);

    expect(result.context).to.include({
      cx_jti: 'test-jti@test-iss',
      sourceChannel: 'test-usage',
      uid: 'test-uid',
      cx_id: 'test-iss',
      cx_type: 'test-type',
      cx_role: 'test-role',
    });

    expect(result.context.callableApiTags).length(2)
    expect(result.context.cx_groups).length(2)

  });



  it('resolves attributes and enriches context when context is not already set', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'ENABLED', scope: 'CLIENTID', cxId: 'test-iss', uid: 'test-uid', cxType: 'test-type' });
    sinon.stub(AllowedIssuerDao, 'getConfigByISS').resolves({ attributeResolversCfgs: [{ name: 'PGCUSTOM', cfg: { purposes: ['test-purpose'] } }] });
    sinon.stub(axios, 'get').resolves({ data: { product: { productRole: 'test-role' }, version: 'test-version', accepted: true } });
    sinon.stub(JwtAttributesDao, 'putJwtAttributes').resolves({});
    const result = await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);

    expect(result.context).to.include({
      cx_jti: 'test-jti@test-iss',
      sourceChannel: 'test-usage',
      uid: 'test-uid',
      cx_id: 'test-iss',
      cx_type: 'test-type',
      cx_role: 'test-role'
    });

    expect(result.context.callableApiTags).length(1)
    expect(result.context.callableApiTags).contain("test-purpose")

  });

  it('throws an error if virtual key not Found', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').throws(new ItemNotFoundException('pn-apikey'));

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal(`VirtualKey not found on table pn-apikey`);
    }
  });

  
  it('throws an error if virtualKey returns more than 1 item', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').throws(new TooManyItemsFoundException('pn-apikey'));

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal(`Too many items found on table pn-apikey`);
    }
  });

  it('throws an error if virtual key status is not allowed', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'DISABLED' });

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('Key is not allowed with status DISABLED');
    }
  });

  it('throws an error if virtual key scope is not allowed', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'ENABLED', scope: 'INVALID_SCOPE' });

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('virtualKey Scope not allowed for this operation');
    }
  });

  it('throws an error if virtual key is not associated to the PG', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'ENABLED', scope: 'CLIENTID', cxId: 'wrong-iss' });

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('virtualKey is not associated to the PG');
    }
  });

  it('throws an error if issuer is not allowed', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'ENABLED', scope: 'CLIENTID', cxId: 'test-iss' });
    sinon.stub(AllowedIssuerDao, 'getConfigByISS').resolves(null);
    sinon.stub(axios, 'get').resolves({ data: { product: { productRole: 'test-role' }, version: 'test-version', accepted: true } });


    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('Issuer not allowed');
    }
  });

  it('throws an error if user has not given consent to use the service', async () => {
    sinon.stub(dynamoFunctions, 'getApiKeyByIndex').resolves({ status: 'ENABLED', scope: 'CLIENTID', cxId: 'test-iss' });
    sinon.stub(AllowedIssuerDao, 'getConfigByISS').resolves({ attributeResolversCfgs: [{ name: 'PGCUSTOM', cfg: { purposes: ['test-purpose'] } }] });
    sinon.stub(axios, 'get').resolves({ data: { product: { productRole: 'test-role' }, version: 'test-version', accepted: false } });

    try {
      await PgCustomAttributeResolver(jwt, lambdaEvent, context, attrResolverCfg);
    } catch (error) {
      expect(error.message).to.equal('User has not given consent to use the service');
    }
  });

  afterEach(() => {
    sinon.restore();
  });
});