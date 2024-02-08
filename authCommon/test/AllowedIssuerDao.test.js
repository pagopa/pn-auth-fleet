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
        const input = fs.readFileSync('test/resources/jwks.json');

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
        ddbMock.on(QueryCommand).resolves({
            Items: [
                { hashKey: ISS_PREFIX+'~https://interop.pagopa.it', sortKey: 'CFG', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256_1', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454398 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it~sha256_2', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
                { hashKey: JWKS_CACHE_PREFIX+'~https://interop.pagopa.it', sortKey: JWKS_CACHE_PREFIX+'~https://interop1.pagopa.it~sha25_3', JWKSUrl: 'https://interop1.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454400 },
            ]
        });
        
        const result = await AllowedIssuerDAO.getIssuerInfoAndJwksCache('https://interop.pagopa.it');
        expect(result.cfg).to.deep.equal(
            { hashKey: 'ISS~https://interop.pagopa.it', sortKey: 'CFG', JWKSUrl: 'https://interop.pagopa.it/.well-known.json', cacheRenewEpochSec: 1630454401 },
        )

        expect(result.jwksCache.length).equal(3);
    });

    it('prepareTransactionInput', () => {
        const prepareTransactionInput = AllowedIssuerDAO.__get__('prepareTransactionInput');
        const cfg = JSON.parse(fs.readFileSync('test/resources/issuerConfig.json'))
        const jwks = fs.readFileSync('test/resources/jwks.json');
        const url = 'https://interop.pagopa.it';
        const sha256 = 'f6b1e529f0ded402c63cc7a1ec9b6556a1c9ec6e5b79ef31087c1efedf4aa160'
        const modificationTimeEpochMs = 1630454401000;
        const jwtExpireSlotInSecond = 1630458001
        // jwtExpireSlot in ISOString 
        const jwtExpireSlot = '2021-09-01T01:00Z'
        const cacheMaxUsageEpochSec = 1630514401

        const result = prepareTransactionInput(cfg, url, jwks, modificationTimeEpochMs);
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

    it('addJwksCacheEntry', async () => {
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
            return JSON.parse(fs.readFileSync('test/resources/jwks.json'));
        }
        const result = await AllowedIssuerDAO.addJwksCacheEntry('https://interop.pagopa.it', downloadUrlFn);
        console.log('result', result)
        expect(result).not.to.undefined;
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
