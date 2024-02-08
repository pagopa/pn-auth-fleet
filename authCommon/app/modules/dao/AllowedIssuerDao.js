const { ddbDocClient } = require('./DynamoDbClient')
const { QueryCommand, GetCommand, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { CFG, ISS_PREFIX, JWKS_CACHE_PREFIX, JWKS_CACHE_EXPIRE_SLOT_ATTRIBUTE_NAME } = require('./constants');
const crypto = require('crypto')

function getISSFromHashKey(hashKey){
    return hashKey.split('~')[1]
}

function buildHashKeyForAllowedIssuer(iss){
    return ISS_PREFIX+'~'+iss
}

function buildSortKeyForJwksCache(url, sha256){
    return JWKS_CACHE_PREFIX+'~' + url + "~" + sha256
}

function computeSha256(data){
    // return sha256 as string
    return crypto.createHash('sha256').update(data).digest('hex')
}

function isJWKSExpired(jwksCacheItem, cfg, renewTimeSeconds, nowInSeconds){
    // JWKSUrl is different wrt the one in the CFG
    if(cfg.JWKSUrl !== jwksCacheItem.JWKSUrl){
        return true
    }

    // cacheRenewEpochSec plus renewTimeSeconds is less than nowInSeconds
    if(jwksCacheItem.cacheRenewEpochSec + renewTimeSeconds <= nowInSeconds){
        return true
    }

    return false
}

function getJwksCacheEntities(jwksItems, nowInSeconds, cfg, renewTimeSeconds){
    // sort by cacheRenewEpochSec desc
    const sortedJwksItems = jwksItems.slice().sort((a, b) => b.cacheRenewEpochSec - a.cacheRenewEpochSec)
    return sortedJwksItems
    // filter by sortKey starts with JWKS_CACHE_PREFIX
    .filter(item => item.sortKey.indexOf(JWKS_CACHE_PREFIX)===0)
    // add expired and rank props
    .map((item, index) => {
        const isExpired = isJWKSExpired(item, cfg, renewTimeSeconds, nowInSeconds)
        return {
            expired: isExpired,
            rank: index,
            ...item
        }
    })
}

async function getIssuerInfoAndJwksCache(iss, renewTimeSeconds){

    const query = {
        TableName: process.env.AUTH_JWT_ISSUER_TABLE,
        Key: {
            hashKey: buildHashKeyForAllowedIssuer(iss)
        }
    }

    const queryCommand = new QueryCommand(query)

    const result = await ddbDocClient.send(queryCommand)

    const cfg = result.Items.find(item => item.sortKey === CFG )
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const jwksCacheEntities = getJwksCacheEntities(result.Items, nowInSeconds, cfg, renewTimeSeconds)

    return {
        cfg,
        jwksCache: jwksCacheEntities
    }
}

async function getConfigByISS(iss){
    const getCommandInput = {
        TableName: process.env.AUTH_JWT_ISSUER_TABLE,
        Key: {
            hashKey: buildHashKeyForAllowedIssuer(iss),
            sortKey: CFG
        }
    }

    const getCommand = new GetCommand(getCommandInput)

    const result = await ddbDocClient.send(getCommand)

    return result.Item
}

function prepareTransactionInput(cfg, downloadUrl, jwksBody, modificationTimeEpochMs){
    const sha256 = computeSha256(jwksBody)
    const jwksCacheExpireSlot = Math.floor( modificationTimeEpochMs / 1000) + cfg.JWKSCacheRenewSec
    const cacheMaxUsageEpochSec = Math.floor( modificationTimeEpochMs / 1000) + cfg.JWKSCacheMaxDurationSec
    
    // convert jwksCacheExpireSlot in YYYY-MM-DDTHH:mmZ
    const jwksCacheExpireSlotWithMinutesPrecision = new Date(jwksCacheExpireSlot * 1000).toISOString().substring(0,16)+'Z'
    
    const iss = getISSFromHashKey(cfg.hashKey)
    return {
        TransactItems: [
            {
                Put: {
                    TableName: process.env.AUTH_JWT_ISSUER_TABLE,
                    Item: {
                        hashKey: buildHashKeyForAllowedIssuer(iss),
                        sortKey: CFG,
                        jwksCacheExpireSlot: jwksCacheExpireSlotWithMinutesPrecision,
                        modificationTimeEpochMs: modificationTimeEpochMs,
                    }
                }
            },
            {
                Put: {
                    TableName: process.env.AUTH_JWT_ISSUER_TABLE,
                    Item: {
                        hashKey: buildHashKeyForAllowedIssuer(iss),
                        sortKey: buildSortKeyForJwksCache(downloadUrl, sha256),
                        JWKSUrl: cfg.JWKSUrl,
                        iss: iss,
                        contentHash: sha256,
                        cacheRenewEpochSec: jwksCacheExpireSlot,
                        cacheMaxUsageEpochSec: cacheMaxUsageEpochSec,
                        JWKSBody: jwksBody,
                        modificationTimeEpochMs: modificationTimeEpochMs,
                        ttl: cacheMaxUsageEpochSec
                    }
                }
            }
        ]
    }
}

async function addJwksCacheEntry(iss, downloadUrlFn){
    const cfg = await getConfigByISS(iss)

    const jwksBodyAsJson = await downloadUrlFn(cfg.JWKSUrl)
    const jwksBody = JSON.stringify(jwksBodyAsJson)
    const modificationTimeEpochMs = Date.now()

    const txInput = prepareTransactionInput(cfg, cfg.JWKSUrl, jwksBody, modificationTimeEpochMs)

    const txCommand = new TransactWriteCommand(txInput)

    return await ddbDocClient.send(txCommand)
}

async function listJwksCacheExpiringAtMinute(expiringMinute){
    const queryInput = {
        TableName: process.env.AUTH_JWT_ISSUER_TABLE,
        IndexName: process.env.AUTH_JWT_ISSUER_TABLE_JWKS_CACHE_EXPIRE_SLOT_INDEX_NAME,
        KeyConditionExpression:  JWKS_CACHE_EXPIRE_SLOT_ATTRIBUTE_NAME+' = :expiringMinute',
        ExpressionAttributeValues: {
            ':expiringMinute': expiringMinute
        }
    }

    const queryCommand = new QueryCommand(queryInput)

    const result = await ddbDocClient.send(queryCommand)

    return result.Items
}


module.exports = {
    getIssuerInfoAndJwksCache,
    addJwksCacheEntry,
    listJwksCacheExpiringAtMinute
}