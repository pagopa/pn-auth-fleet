const rewire = require('rewire');
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { expect } = require("chai");
const fs = require('fs')
const { ISS_PREFIX, JWKS_CACHE_PREFIX } = require('../app/modules/dao/constants');

const ddbMock = mockClient(DynamoDBDocumentClient);
const AllowedIssuerDAO = rewire("../app/modules/dao/AllowedIssuerDao");

process.env.AUTH_JWT_ISSUER_TABLE = 'AUTH_JWT_ISSUER_TABLE';
process.env.JWKS_CONTENT_LIMIT_BYTES = '51200';
process.env.JWKS_FOLLOW_REDIRECT = 'true';
process.env.JWKS_DYNAMO_CACHE_CONTENT_LIMIT = '51200'
process.env.JWKS_CONTENTS = 'bucket-name'

const getFilaAsByteArray = (fileName) => {
    return Buffer.from(fs.readFileSync(fileName, 'binary'));
}


describe('AllowedIssuerDAO Testing', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    it('getISSFromHashKey', () => {
        const getISSFromHashKey = AllowedIssuerDAO.__get__('getISSFromHashKey');
        const result = getISSFromHashKey('ISS~https://interop.pagopa.it');
        expect(result).to.equal('https://interop.pagopa.it');
    });

    it('listJwksCacheExpiringAtMinute', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [
                { hashKey: 'hashKey', sortKey: 'sortKey', iss: 'https://interop.pagopa.it' }
            ]
        });
        const minute = '2024-01-01T00:01Z'
        const expiring = await AllowedIssuerDAO.listJwksCacheExpiringAtMinute(minute);     
        
        expect(expiring).lengthOf(1);
    });

    it('buildHashKeyForAllowedIssuer', () => {
        const buildHashKeyForAllowedIssuer = AllowedIssuerDAO.__get__('buildHashKeyForAllowedIssuer');
        const result = buildHashKeyForAllowedIssuer('https://interop.pagopa.it');
        expect(result).to.equal(ISS_PREFIX+'~https://interop.pagopa.it');
    })

    it('buildSortKeyForJwksCache', () => {
        const buildSortKeyForJwksCache = AllowedIssuerDAO.__get__('buildSortKeyForJwksCache');
        const result = buildSortKeyForJwksCache('https://interop.pagopa.it', 'sha256');
        expect(result).to.equal(JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256');
    })

    it('computeSha256', () => {
        const expectedSha = 'f6b1e529f0ded402c63cc7a1ec9b6556a1c9ec6e5b79ef31087c1efedf4aa160';
        const input = getFilaAsByteArray('test/resources/jwks.json');

        const computeSha256 = AllowedIssuerDAO.__get__('computeSha256');
        const result = computeSha256(input);

        expect(result).to.equal(expectedSha);
    })

    it('isJWKSExpired - expired', () => {
        const isJWKSExpired = AllowedIssuerDAO.__get__('isJWKSExpired');
        const jwksCacheItem = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json',
            cacheRenewEpochSec: 1630454400
        }
        const cfg = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json'
        }
        const renewTimeSeconds = 61;
        const nowInSeconds = 1630454460;
        const result = isJWKSExpired(jwksCacheItem, cfg, renewTimeSeconds, nowInSeconds);
        expect(result).to.equal(false);
    })

    it('isJWKSExpired - expired - wrong url', () => {
        const isJWKSExpired = AllowedIssuerDAO.__get__('isJWKSExpired');
        const jwksCacheItem = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json',
            cacheRenewEpochSec: 1630454400
        }
        const cfg = {
            JWKSUrl: 'https://interop1.pagopa.it/.well-known.json'
        }
        const renewTimeSeconds = 60;
        const nowInSeconds = 1630454460;
        const result = isJWKSExpired(jwksCacheItem, cfg, renewTimeSeconds, nowInSeconds);
        expect(result).to.equal(true);
    })

    it('isJWKSExpired - expired - out', () => {
        const isJWKSExpired = AllowedIssuerDAO.__get__('isJWKSExpired');
        const jwksCacheItem = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json',
            cacheRenewEpochSec: 1630454399
        }
        const cfg = {
            JWKSUrl: 'https://interop1.pagopa.it/.well-known.json'
        }
        const renewTimeSeconds = 60;
        const nowInSeconds = 1630454460;
        const result = isJWKSExpired(jwksCacheItem, cfg, renewTimeSeconds, nowInSeconds);
        expect(result).to.equal(true);
    })

    it('isJWKSExpired - expired - out of renew timeframe', () => {
        const isJWKSExpired = AllowedIssuerDAO.__get__('isJWKSExpired');
        const jwksCacheItem = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json',
            cacheRenewEpochSec: 1630454400
        }
        const cfg = {
            JWKSUrl: 'https://interop1.pagopa.it/.well-known.json'
        }
        const renewTimeSeconds = 59;
        const nowInSeconds = 1630454460;
        const result = isJWKSExpired(jwksCacheItem, cfg, renewTimeSeconds, nowInSeconds);
        expect(result).to.equal(true);
    })

    it('getJwksCacheEntities', () => {
        const getJwksCacheEntities = AllowedIssuerDAO.__get__('getJwksCacheEntities');
        const jwksItems = [
            { sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454398 },
            { sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
            { sortKey: JWKS_CACHE_PREFIX+'~https://interop1.pagopa.it~sha256', JWKSUrl: 'https://interop1.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454400 },
        ]

        const cfg = {
            JWKSUrl: 'https://interop.pagopa.it/.well-known.json'
        }

        const renewTimeSeconds = 60;

        const nowInSeconds = 1630454460;

        const result = getJwksCacheEntities(jwksItems, nowInSeconds, cfg, renewTimeSeconds);

        expect(result).to.deep.equal([
            { expired: false, rank: 0, sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
            { expired: true, rank: 1, sortKey: JWKS_CACHE_PREFIX+'~https://interop1.pagopa.it~sha256', JWKSUrl: 'https://interop1.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454400 },
            { expired: true, rank: 2, sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454398 },
        ]);
    });

    it('getIssuerInfoAndJwksCache', async () => {
        const response = getFilaAsByteArray('test/resources/jwks.json')
        ddbMock.on(QueryCommand).resolves({
            Items: [
                { hashKey: ISS_PREFIX+'~https://interop.pagopa.it', sortKey: 'CFG', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256_1', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454398 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256_2', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop1.pagopa.it~sha25_3', JWKSUrl: 'https://interop1.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454400 },
                { hashKey: JWKS_CACHE_PREFIX+'~s3://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop1.pagopa.it~sha25_4', JWKSS3Url: 's3://bucket-name/key.jwks', cacheRenewEpochSec: 1630454401 },
            ]
        });

        const getObjectAsByteArrayStub = () => {
            return response;
        };
        AllowedIssuerDAO.__set__('getObjectAsByteArray', getObjectAsByteArrayStub);
        const result = await AllowedIssuerDAO.getIssuerInfoAndJwksCache('https://interop.pagopa.it');
        expect(result.cfg).to.deep.equal(
            { hashKey: 'ISS~https://interop.pagopa.it', sortKey: 'CFG', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
        )

        expect(result.jwksCache.length).equal(4);
    });

    it('prepareTransactionInput', async () => {
        const prepareTransactionInput = AllowedIssuerDAO.__get__('prepareTransactionInput');
        const cfg = JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        const jwks = getFilaAsByteArray('test/resources/jwks.json');
        const url = 'https://interop.pagopa.it';
        const sha256 = 'f6b1e529f0ded402c63cc7a1ec9b6556a1c9ec6e5b79ef31087c1efedf4aa160'
        const modificationTimeEpochMs = 1630454401000;
        const jwtExpireSlotInSecond = 1630458001
        // jwtExpireSlot in ISOString 
        const jwtExpireSlot = '2021-09-01T01:00Z'
        const cacheMaxUsageEpochSec = 1630458001
        const result = await prepareTransactionInput(cfg, url, jwks, modificationTimeEpochMs);

        expect(result.TransactItems.length).equal(2);
        expect(result.TransactItems[0].Update.ExpressionAttributeValues).to.deep.equal({
            ':jwksCacheExpireSlot': jwtExpireSlot,
            ':modificationTimeEpochMs': modificationTimeEpochMs
        })

        expect(result.TransactItems[1].Put.Item).to.deep.equal({
            hashKey: 'ISS~https://interop.pagopa.it',
            sortKey: JWKS_CACHE_PREFIX+'~' + url + "~" + sha256,
            contentHash: sha256,
            JWKSUrl: cfg.JWKSUrl,
            iss: 'https://interop.pagopa.it',
            JWKSBody: jwks,
            cacheRenewEpochSec: jwtExpireSlotInSecond,
            cacheMaxUsageEpochSec: cacheMaxUsageEpochSec,
            modificationTimeEpochMs: modificationTimeEpochMs,
            ttl: cacheMaxUsageEpochSec
        })
    });

  /*  it('prepareTransactionInput s3', async () => {
        const prepareTransactionInput = AllowedIssuerDAO.__get__('prepareTransactionInput');
        const putObjectStub = () => {
        };
        AllowedIssuerDAO.__set__('putObject', putObjectStub);
        const cfg = JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        const buffer = Buffer.from(cfg.JWKSUrl).toString('base64');
        const jwks = getFilaAsByteArray('test/resources/jwkss3.json');
        const url = 'https://interop.pagopa.it';
        const sha256 = 'acf5771d2705d19a972c501a3ec0c88051d1941bf1aaed33e53e0a7e4c8f0002'
        const modificationTimeEpochMs = 1630454401000;
        const jwtExpireSlotInSecond = 1630458001
        // jwtExpireSlot in ISOString 
        const jwtExpireSlot = '2021-09-01T01:00Z'
        const cacheMaxUsageEpochSec = 1630514401
        const result = await prepareTransactionInput(cfg, url, jwks, modificationTimeEpochMs);

        expect(result.TransactItems.length).equal(2);
        expect(result.TransactItems[0].Update.ExpressionAttributeValues).to.deep.equal({
            ':jwksCacheExpireSlot': jwtExpireSlot,
            ':modificationTimeEpochMs': modificationTimeEpochMs
        })

        expect(result.TransactItems[1].Put.Item).to.deep.equal({
            hashKey: 'ISS~https://interop.pagopa.it',
            sortKey: JWKS_CACHE_PREFIX+'~' + url + "~" + sha256,
            contentHash: sha256,
            JWKSUrl: cfg.JWKSUrl,
            iss: 'https://interop.pagopa.it',
            JWKSS3Url: 's3://bucket-name/jwks_cache_entries/ISS_https://interop.pagopa.it/source_url_urlSafeBase64_' + Buffer.from(cfg.JWKSUrl).toString('base64') + '/content_sha256_' + sha256 + '_jwks.json',
            cacheRenewEpochSec: jwtExpireSlotInSecond,
            cacheMaxUsageEpochSec: cacheMaxUsageEpochSec,
            modificationTimeEpochMs: modificationTimeEpochMs,
            ttl: cacheMaxUsageEpochSec
        })
    });
    */

   /* it('prepareTransactionInput s3 failure', async () => {
        const prepareTransactionInput = AllowedIssuerDAO.__get__('prepareTransactionInput');
        const putObjectStub = () => {
            throw new Error();
        };
        AllowedIssuerDAO.__set__('putObject', putObjectStub);
        const cfg = JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        const jwks = getFilaAsByteArray('test/resources/jwkss3.json');
        const sha256 = 'acf5771d2705d19a972c501a3ec0c88051d1941bf1aaed33e53e0a7e4c8f0002'
        const url = 's3://bucket-name/jwks_cache_entries/ISS_https://interop.pagopa.it/source_url_urlSafeBase64_' + Buffer.from(cfg.JWKSUrl).toString('base64') + '/content_sha256_' + sha256 + '_jwks.json';
        const modificationTimeEpochMs = 1630454401000;
        try {
            const result = await prepareTransactionInput(cfg, url, jwks, modificationTimeEpochMs);
        }
        catch (error) {
            expect(error.message).to.equal('Error uploading S3 object ' + url);
        }
    });*/  

    it('addJwksCacheEntryDynamo', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        });

        ddbMock.on(TransactWriteCommand).resolves({
            ConsumedCapacity: {
                TableName: 'string',
                CapacityUnits: 1,
                Table: {
                    CapacityUnits: 1
                }
            },
            ItemCollectionMetrics: {
                ItemCollectionKey: {
                    'string': {
                        S: 'string',
                        N: 'string',
                        B: 'string'
                    }
                },
                SizeEstimateRangeGB: [
                    1,
                    2
                ]
            }
        });

        const downloadUrlFn = async () => {
            return getFilaAsByteArray('test/resources/jwks.json');
        }
        const result = await AllowedIssuerDAO.addJwksCacheEntry('https://interop.pagopa.it', downloadUrlFn);
        expect(result).not.to.undefined;
    });

    it('addJwksCacheEntryS3', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        });

        ddbMock.on(TransactWriteCommand).resolves({
            ConsumedCapacity: {
                TableName: 'string',
                CapacityUnits: 1,
                Table: {
                    CapacityUnits: 1
                }
            },
            ItemCollectionMetrics: {
                ItemCollectionKey: {
                    'string': {
                        S: 'string',
                        N: 'string',
                        B: 'string'
                    }
                },
                SizeEstimateRangeGB: [
                    1,
                    2
                ]
            }
        });

        const downloadUrlFn = async () => {
            return getFilaAsByteArray('test/resources/jwkss3.json');
        }
        const result = await AllowedIssuerDAO.addJwksCacheEntry('https://interop.pagopa.it', downloadUrlFn);
        expect(result).not.to.undefined;
    });

    it('addJwksCacheEntryS3 warning', async () => {
        const url = 'https://interop.pagopa.it/.well-known.json'
        const getConfigByISS = () => {
            return JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        }
        const downloadUrlFn = async () => {
            return getFilaAsByteArray('test/resources/jwkss3.json');
        }
        const putObject = async () => {
            throw new Error("Error uploading S3 object " + url)
        }
        AllowedIssuerDAO.__set__('putObject', putObject);
        AllowedIssuerDAO.__set__('getConfigByISS', getConfigByISS);
        try {
            await AllowedIssuerDAO.addJwksCacheEntry(url, downloadUrlFn);
        }
        catch (error) {
            expect(error.message).to.equal('Error uploading S3 object ' + url);
        }
    });

    it('preparePutObjectInput', () => {
        const preparePutObjectInput = AllowedIssuerDAO.__get__('preparePutObjectInput');
        const bucketName = 'bucketName'
        const cfg = JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        const jwksBodyByteArray = getFilaAsByteArray('test/resources/jwks.json');
        const iss = cfg.hashKey.split('~')[1]
        const safeUrlBase64 = Buffer.from(cfg.JWKSUrl).toString('base64');
        const sha256 = 'f6b1e529f0ded402c63cc7a1ec9b6556a1c9ec6e5b79ef31087c1efedf4aa160'
        const modificationTimeEpochMs = 1630454401000;

        const result = preparePutObjectInput(bucketName, iss, sha256, cfg.JWKSUrl, jwksBodyByteArray, modificationTimeEpochMs);
        expect(result).not.to.undefined;
        expect(result.Key).to.deep.equal('jwks_cache_entries/ISS_' + iss + '/source_url_urlSafeBase64_' + safeUrlBase64 + '/content_sha256_' + sha256 + '_jwks.json');
    });

    it('postponeJwksCacheEntryValidation', async () => {
        let date = new Date().toISOString();
        const dateString = date.slice(0, 16) + 'Z';
        ddbMock.on(UpdateCommand).resolves({
            ConsumedCapacity: {
                TableName: process.env.AUTH_JWT_ISSUER_TABLE,
                CapacityUnits: 1,
            }
        });
        const result = await AllowedIssuerDAO.postponeJwksCacheEntryValidation('ISS~https://interop.pagopa.it', dateString);
        expect(result).not.to.undefined;
    });
});
