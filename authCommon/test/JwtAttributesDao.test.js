const rewire = require('rewire');
const { ATTR_PREFIX } = require('../app/modules/dao/constants');
const JwtAttributesDao = rewire("../app/modules/dao/JwtAttributesDao");
const fs = require('fs')
const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

process.env.AUTH_JWT_ATTRIBUTE_TABLE = "AUTH_JWT_ATTRIBUTE_TABLE"

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
