const rewire = require('rewire');
const { expect } = require("chai");
const fs = require('fs')

const DatabaseResolveFunction = rewire('../app/modules/attributeResolvers/DatabaseAttributeResolver');

describe('DatabaseAttributeResolver', () => {
  it('databaseAttributeResolver should return jwtAttributes context', async () => {
    const jwtAttributes = JSON.parse(fs.readFileSync('src/test/resources/jwtAttributes.json'))
    const jwtAttributesDaoMock = async (first, second, third, fourth) => {
      return jwtAttributes
    }
    DatabaseResolveFunction.__set__('JwtAttributesDao.listJwtAttributes', jwtAttributesDaoMock);
    const jwt = {
      "kid": "string"
    }
    const lambdaEvent = {}
    const context = {
      key: "value"
    } 
    const attrResolverCfg = ""
    const result = await DatabaseResolveFunction( jwt, lambdaEvent, context, attrResolverCfg );
    expect(result.context['key']).to.equal("jwtAttributes")
  });

  it('databaseAttributeResolver should return input context', async () => {
    const jwtAttributesDaoMock = async (first, second, third, fourth) => {}
    DatabaseResolveFunction.__set__('JwtAttributesDao.listJwtAttributes', jwtAttributesDaoMock);
    const jwt = "jwtAttribute"
    const lambdaEvent = {}
    const context = {
      key: "value"
    } 
    const attrResolverCfg =""
    const result = await DatabaseResolveFunction( jwt, lambdaEvent, context, attrResolverCfg );
    expect(result.context).to.equal(context)
  });
})