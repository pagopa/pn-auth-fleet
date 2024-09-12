const { AllowedIssuerDao } = require('pn-auth-common');
const { SqsHandler } = require('pn-auth-common');
const AuthenticationError = require('../../errors/AuthenticationError');
const crypto = require('crypto');

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

class IssuersLocalCache {

    #renewTimeSeconds;
    #internalCacheTtlSeconds;
    #cacheStore = new Map();

    constructor(renewTimeSeconds, internalCacheTtlSeconds) {
        this.#renewTimeSeconds = renewTimeSeconds;
        this.#internalCacheTtlSeconds = internalCacheTtlSeconds;
    }

    #isCacheItemValid(cacheItem, nowInSeconds) {
        const modificationTimeInSeconds = Math.floor(cacheItem.cfg.modificationTimeEpochMs/1000);
        return modificationTimeInSeconds > nowInSeconds - this.#internalCacheTtlSeconds;
    }

    #getValidCacheItem(iss){
        const cacheItem = this.#cacheStore.get(iss);
        if(!cacheItem) {
            return null
        }

        if(this.#isCacheItemValid(cacheItem, Math.floor(Date.now() / 1000))) {
            return cacheItem;
        }

        return null
    }

    async #emitRemoteJwksCacheInvalidationEventAndWait(iss, lastRefresh) {
        const messageDelay = 0;
        const queueUrl = process.env.JWKS_FORCE_REFRESH_QUEUE_URL
        const bodyMessage = {
            "iss": iss,
            "cacheExpiredTS": cacheExpirationTime,
            "requestTimestamp": new Date().toISOString(),
            "uuid": crypto.randomUUID()
        }
        const result = await SqsHandler.sendMessage(queueUrl, bodyMessage, messageDelay)
        await sleep(parseInt(process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS) * 1000)
        return result;
    }

    #invalidateLocalCache(iss) {
        this.#cacheStore.delete(iss);
    }

    async getOrLoad(iss) {
        let cacheItem = this.#getValidCacheItem(iss);
        if(!cacheItem) {
            try {
                cacheItem = await AllowedIssuerDao.getIssuerInfoAndJwksCache(iss, this.#renewTimeSeconds);
            } catch(e){
                if(e.name==='IssuerNotFoundError'){
                    throw new AuthenticationError("Issuer not found", { iss: iss }, false);
                } else {
                    throw e;
                }
            }

            if(!cacheItem) {
               throw new Error("Unable to get issuer info and jwks cache for "+iss)
            }
            this.#cacheStore.set(iss, cacheItem);
        }

        return this.#cacheStore.get(iss);
    }

    async getWithForceRefresh(iss, cacheExpirationTime) {
        await this.#emitRemoteJwksCacheInvalidationEventAndWait(iss, cacheExpirationTime)
        this.#invalidateLocalCache(iss)
        return this.getOrLoad(iss)
    }
}

module.exports = IssuersLocalCache