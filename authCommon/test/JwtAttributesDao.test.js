const rewire = require('rewire');
const { ATTR_PREFIX } = require('../app/modules/dao/constants');
const JwtAttributesDao = rewire("../app/modules/dao/JwtAttributesDao");
const fs = require('fs')
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const ddbMock = mockClient(DynamoDBDocumentClient);

process.env.AUTH_JWT_ATTRIBUTE_TABLE = "AUTH_JWT_ATTRIBUTE_TABLE"

describe('AllowedIssuerDAO Testing', () => {
 
    it('buildHashKeyForAttributeResolver', () => {
        const jwt = fs.readFileSync('test/resources/jwt.json')
        const attrResolverCfg = {
            "keyAttributeName": "kid"
        }
        const result = JwtAttributesDao.buildHashKeyForAttributeResolver(jwt, attrResolverCfg);
        expect(result).to.equal(ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwt[ attrResolverCfg.keyAttributeName ]);
    });

    it('listJwtAttributes', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [{ 
                hashKey: 'hashKey', 
                sortKey: 'sortKey', 
                ttl: 123, 
                issuer: "issuer",
                issuerRelatedKey: "issuerRelatedKey",
                contextAttributes: {},
                cacheMaxUsageEpochSec: 123,
                resolver: "DATABASE",
                modificationTimeEpochMs: 123
            }]
        });
        const jwt = fs.readFileSync('test/resources/jwt.json')
        const attrResolverCfg = {
                "keyAttributeName": "kid"
            }
        const expiring = await JwtAttributesDao.listJwtAttributes(jwt, attrResolverCfg);     
        
        expect(expiring).lengthOf(1);
    });

});
