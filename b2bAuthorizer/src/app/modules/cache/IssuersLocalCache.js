const { AllowedIssuerDao } = require('pn-auth-common')

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
        console.log('emitRemoteJwksCacheInvalidationEventAndWait not implemented: '+iss)
    }

    #invalidateLocalCache(iss) {
        this.#cacheStore.delete(iss);
    }

    async getOrLoad(iss) {
        let cacheItem = this.#getValidCacheItem(iss);
        if(!cacheItem) {
           cacheItem = await AllowedIssuerDao.getIssuerInfoAndJwksCache(iss, this.#renewTimeSeconds);
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