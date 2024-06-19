const rewire = require('rewire');
const { expect } = require("chai");
const fs = require('fs')

const DefaultAttributeResolver = require("../app/modules/attributeResolvers/DefaultAttributeResolver");

process.env.PDND_JWT_ISSUER = 'test'

describe('DefaultAttributeResolver', () => {
  it('DefaultAttributeResolver should return context with RADD', async () => {
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

  it("DefaultAttributeResolver should return an exception if intended usage is missing", async () => {
    const jwt = {
      "iss": "test",
      "kid": "string"
    }
    const lambdaEvent = {}
    const context = {
      key: "value"
    } 
    const attrResolverCfg = ""
    try {
      await await DefaultAttributeResolver( jwt, lambdaEvent, context, attrResolverCfg );
      expect().fail('Expected an exception')
    } catch(e) {
      expect(e.message).to.be.equal("Error on intendedUsage!!!");
    }
  })
})