const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const fs = require('fs')

describe('AttributeResolversMap', () => {

    it('should raise exception if resolve name not found', async () => {
        const jwt = {};
        const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventB2B.json'))
        const attributeResolversCfgs = [
            {
                name: 'NOT_EXISTING',
                cfg: {}
            },
            {
                name: 'DATABASE',
                cfg: {}
            }
        ];

        const AttributeResolversMap = require('../app/modules/attributeResolvers/AttributeResolversMap');
        const attributeResolversMap = new AttributeResolversMap();

        try {
            await attributeResolversMap.resolveAttributes(jwt, lambdaEvent, attributeResolversCfgs);
            expect.fail('Error not thrown');
        } catch (error) {
            expect(error.message).to.equal("Attribute resolver with name NOT_EXISTING not found");
        }
    });

    it('should return context', async () => {
        const jwt = {};
        const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventB2B.json'))
        const attributeResolversCfgs = [
            {
                name: 'DATABASE',
                cfg: {}
            }
        ];

        // mock DatabaseAttributeResolver 
        const context = {};
        const usageIdentifierKey = 'ABC';
        const mockDatabaseAttributeResolver = sinon.stub().returns({ context, usageIdentifierKey });
        const AttributeResolversMap = proxyquire.noCallThru().load("../app/modules/attributeResolvers/AttributeResolversMap", {
            "./DatabaseAttributeResolver.js": mockDatabaseAttributeResolver,
        });
                
        const attributeResolversMap = new AttributeResolversMap();
        const result = await attributeResolversMap.resolveAttributes(jwt, lambdaEvent, attributeResolversCfgs);
        console.log('result', result)
        expect(result).to.deep.equal({ context, usageIdentifierKey });
    });

    it('should return exception if usageIdentifier has conflicts', async () => {
        const jwt = {};
        const lambdaEvent = JSON.parse(fs.readFileSync('src/test/resources/lambdaEventB2B.json'))
        const attributeResolversCfgs = [
            {
                name: 'DATABASE',
                cfg: {}
            },
            {
                name: 'DATABASE',
                cfg: {}
            }
        ];

        // mock DatabaseAttributeResolver 
        const context = {};
        const usageIdentifierKey = 'ABC';
        const mockDatabaseAttributeResolver = sinon.stub()
            .onFirstCall().returns({ context, usageIdentifierKey })
            .onSecondCall().returns({ context, usageIdentifierKey });

        const AttributeResolversMap = proxyquire.noCallThru().load("../app/modules/attributeResolvers/AttributeResolversMap", {
            "./DatabaseAttributeResolver.js": mockDatabaseAttributeResolver,
        });
                
        const attributeResolversMap = new AttributeResolversMap();
        try {
            const result = await attributeResolversMap.resolveAttributes(jwt, lambdaEvent, attributeResolversCfgs);
            expect.fail('Error not thrown');
        } catch(e){
            expect(e.message).to.equal("usageIdentifierKey conflict");
        }
       
    });
    
});

