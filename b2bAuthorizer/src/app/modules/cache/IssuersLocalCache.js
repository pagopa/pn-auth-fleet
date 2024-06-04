const { AllowedIssuerDao } = require('pn-auth-common');
const { sendMessage } = require('pn-auth-common');
const { uuid } = require('uuidv4');
const AuthenticationError = require('../../errors/AuthenticationError');

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

    async #emitRemoteJwksCacheInvalidationEventAndWait(iss) {
        const messageDelay = 0;
        const queueUrl = process.env.JWKS_FORCE_REFRESH_QUEUE_URL
        const bodyMessage = {
            "iss": iss,
            "requestTimestamp": new Date().toISOString(),
            "uuid": uuid()
        }
        await sendMessage(queueUrl, bodyMessage, messageDelay)
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

    async getWithForceRefresh(iss) {
        await this.#emitRemoteJwksCacheInvalidationEventAndWait(iss)
        this.#invalidateLocalCache(iss)
        return this.getOrLoad(iss)
    }
}

module.exports = IssuersLocalCache