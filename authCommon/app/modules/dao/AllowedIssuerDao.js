const { ddbDocClient } = require('./DynamoDbClient')
const { getObjectAsByteArray, putObject } = require('./S3Client')
const { QueryCommand, GetCommand, TransactWriteCommand, UpdateCommand} = require("@aws-sdk/lib-dynamodb");
const { CFG, ISS_PREFIX, JWKS_CACHE_PREFIX, JWKS_CACHE_EXPIRE_SLOT_ATTRIBUTE_NAME, JWT_ISSUER_TABLE_JWKS_CACHE_EXPIRE_SLOT_INDEX_NAME } = require('./constants');
const crypto = require('crypto')
const IssuerNotFoundError = require('./IssuerNotFoundError')

function getISSFromHashKey(hashKey){
    return hashKey.split('~')[1]
}

function buildHashKeyForAllowedIssuer(iss){
    return ISS_PREFIX+'~'+iss
}

function buildSortKeyForJwksCache(url, sha256){
    return JWKS_CACHE_PREFIX+'~' + url + "~" + sha256
}

function computeSha256(binaryData){
    return crypto.createHash('sha256').update(binaryData).digest('hex')
}

function computeSafeUrlBase64(url){
    return Buffer.from(url).toString('base64');
}

function prepareKeyInput(iss, JWKSUrl, sha256){
    const safeUrlBase64 = computeSafeUrlBase64(JWKSUrl)
    return '/jwks_cache_entries/ISS_' + iss + '/source_url_urlSafeBase64_' + safeUrlBase64 + '/content_sha256_' + sha256 + '_jwks.json';
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
        KeyConditionExpression: 'hashKey = :hashKey',
        ExpressionAttributeValues: {
            ':hashKey': buildHashKeyForAllowedIssuer(iss),
            ':nowInSeconds': Math.floor(Date.now() / 1000)
        },
        FilterExpression: 'attribute_not_exists(#ttl) OR #ttl > :nowInSeconds',
        ExpressionAttributeNames: {
            '#ttl': 'ttl'
        }
    }

    const queryCommand = new QueryCommand(query)

    const result = await ddbDocClient.send(queryCommand)

    const cfg = result.Items.find(item => item.sortKey === CFG )

    if(!cfg){
        throw new IssuerNotFoundError('No Issuer configuration found for '+iss)
    }

    const nowInSeconds = Math.floor(Date.now() / 1000)
    const jwksCacheEntities = getJwksCacheEntities(result.Items, nowInSeconds, cfg, renewTimeSeconds)

    for(let i = 0; i < jwksCacheEntities.length; i++) {
        const jwksCacheEntity = jwksCacheEntities[i];
        try {
            if(!jwksCacheEntity.JWKSBody) {
                if(JWKSS3Url) {
                    const splittedUrl = JWKSS3Url.substring(5).split('/');
                    const bucket = splittedUrl.shift();
                    const key = splittedUrl.join('/')
                    const jwksBinaryBody = getObjectAsByteArray(bucket, key)
                    jwksCacheEntities[i].JWKSBody = jwksBinaryBody
                }
                else {
                    throw new Error('JWKS S3 not found ', JWKSS3Url)
                }
            }
        } catch (error) {
            console.error(error)
        }
    }
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

function preparePutObjectInput(bucketName, iss, sha256, JWKSUrl, jwksBinaryBody, cacheMaxUsageEpochSec){
    const keyInput = prepareKeyInput(iss, JWKSUrl, sha256)
    const tags = 'cacheMaxUsageEpochSec='+cacheMaxUsageEpochSec;
    
    return input = { // PutObjectRequest
        Bucket: bucketName,
        Key: keyInput,
        Tagging: tags,
        Body: Buffer.from(jwksBinaryBody).toString()
    }
}

async function prepareTransactionInput(cfg, downloadUrl, jwksBinaryBody, modificationTimeEpochMs){
    const dynamoCacheLimit = process.env.JWKS_DYNAMO_CACHE_CONTENT_LIMIT
    const bucketName = process.env.JWKS_CONTENTS
    let hasDynamoJWKS = true;
    const sha256 = computeSha256(jwksBinaryBody)
    const jwksCacheExpireSlot = Math.floor( modificationTimeEpochMs / 1000) + cfg.JWKSCacheRenewSec
    const cacheMaxUsageEpochSec = Math.floor( modificationTimeEpochMs / 1000) + cfg.JWKSCacheMaxDurationSec
    const jwksBinaryBodySize = Buffer.from(jwksBinaryBody)
    // convert jwksCacheExpireSlot in YYYY-MM-DDTHH:mmZ
    const jwksCacheExpireSlotWithMinutesPrecision = new Date(jwksCacheExpireSlot * 1000).toISOString().substring(0,16)+'Z'
    
    const iss = getISSFromHashKey(cfg.hashKey)

    if(jwksBinaryBodySize > dynamoCacheLimit) {
        const input = preparePutObjectInput(bucketName, iss, sha256, cfg.JWKSUrl, jwksBinaryBody, cacheMaxUsageEpochSec)
        try {
            await putObject(input)
        }
        catch (error) {
            console.warn(error)
            throw new Error("problem to put JWKS in S3 " + downloadUrl)
        }
        hasDynamoJWKS = false;
    }

    return {
        TransactItems: [
            {
                Update: {
                    TableName: process.env.AUTH_JWT_ISSUER_TABLE,
                    Key: {
                        hashKey: buildHashKeyForAllowedIssuer(iss),
                        sortKey: CFG
                    },
                    UpdateExpression: 'SET jwksCacheExpireSlot = :jwksCacheExpireSlot, modificationTimeEpochMs = :modificationTimeEpochMs',
                    ExpressionAttributeValues: {
                        ':jwksCacheExpireSlot': jwksCacheExpireSlotWithMinutesPrecision,
                        ':modificationTimeEpochMs': modificationTimeEpochMs
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
                        ...(hasDynamoJWKS ? { JWKSBody : jwksBinaryBody } : { JWKSS3Url : 's3://' + bucketName + prepareKeyInput(iss, cfg.JWKSUrl, sha256)}),
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

    const jwksBodyBinary = await downloadUrlFn(cfg.JWKSUrl)
    const modificationTimeEpochMs = Date.now()

    const txInput = await prepareTransactionInput(cfg, cfg.JWKSUrl, jwksBodyBinary, modificationTimeEpochMs)

    const txCommand = new TransactWriteCommand(txInput)

    return await ddbDocClient.send(txCommand)
}

async function listJwksCacheExpiringAtMinute(expiringMinute){
    const queryInput = {
        TableName: process.env.AUTH_JWT_ISSUER_TABLE,
        IndexName: JWT_ISSUER_TABLE_JWKS_CACHE_EXPIRE_SLOT_INDEX_NAME,
        KeyConditionExpression:  JWKS_CACHE_EXPIRE_SLOT_ATTRIBUTE_NAME+' = :expiringMinute',
        ExpressionAttributeValues: {
            ':expiringMinute': expiringMinute
        },
        // ConsistentRead: true // not supported by GSI
    }

    const queryCommand = new QueryCommand(queryInput)

    const result = await ddbDocClient.send(queryCommand)

    return result.Items
}

async function postponeJwksCacheEntryValidation(iss, jwksCacheExpireSlot){
    const updateItemInput = {
        TableName: process.env.AUTH_JWT_ISSUER_TABLE,
        Key: {
            "hashKey": buildHashKeyForAllowedIssuer(iss),
            "sortKey": CFG
        },
        UpdateExpression: 'SET jwksCacheExpireSlot = :jwksCacheExpireSlot, modificationTimeEpochMs = :modificationTimeEpochMs',
        ExpressionAttributeValues: {
            ':jwksCacheExpireSlot': jwksCacheExpireSlot,
            ':modificationTimeEpochMs': Date.now()
        }
    }

    const updateCommand = new UpdateCommand(updateItemInput)

    return await ddbDocClient.send(updateCommand)
}



module.exports = {
    getIssuerInfoAndJwksCache,
    addJwksCacheEntry,
    listJwksCacheExpiringAtMinute,
    postponeJwksCacheEntryValidation
}