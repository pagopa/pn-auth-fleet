const rewire = require('rewire');
const { expect } = require("chai");
const fs = require('fs')

const DefaultAttributeResolver = require("../app/modules/attributeResolvers/DefaultAttributeResolver");

process.env.PDND_JWT_ISSUER = 'test'

describe('DefaultAttributeResolver', () => {
  it('DefaultAttributeResolver should return context with RADD', async () => {
    const jwtAttributes = JSON.parse(fs.readFileSync('src/test/resources/jwtAttributes.json'))
    const jwt = {
      "kid": "string"
    }
    const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventRadd.json'))
    const context = {
      key: "value"
    } 
    const attrResolverCfg = ""
    const result = await DefaultAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg );
    expect(result.context['sourceChannel']).to.equal("RADD")
    expect(result.context['applicationRole']).to.equal("RADD")
    expect(result.context['sourceChannelDetails']).to.equal("")
  });

  it('DefaultAttributeResolver should return context with B2B no interop', async () => {
    const jwtAttributes = JSON.parse(fs.readFileSync('src/test/resources/jwtAttributes.json'))
    const jwt = {
      "kid": "string"
    }
    const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventB2B.json'))
    const context = {
      key: "value"
    } 
    const attrResolverCfg = ""
    const result = await DefaultAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg );
    expect(result.context['sourceChannel']).to.equal("B2B")
    expect(result.context['applicationRole']).to.equal("MITTENTE")
    expect(result.context['sourceChannelDetails']).to.equal("NONINTEROP")
  });

  it('DefaultAttributeResolver should return context with B2B with interop', async () => {
    const jwtAttributes = JSON.parse(fs.readFileSync('src/test/resources/jwtAttributes.json'))
    const jwt = {
      "iss": "test",
      "kid": "string"
    }
    const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventB2B.json'))
    const context = {
      key: "value"
    } 
    const attrResolverCfg = ""
    const result = await DefaultAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg );
    expect(result.context['sourceChannel']).to.equal("B2B")
    expect(result.context['applicationRole']).to.equal("MITTENTE")
    expect(result.context['sourceChannelDetails']).to.equal("INTEROP")
  });
})