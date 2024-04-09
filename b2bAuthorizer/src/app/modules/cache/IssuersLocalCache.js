const { AllowedIssuerDao } = require('pn-auth-common');
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
        console.log('emitRemoteJwksCacheInvalidationEventAndWait not implemented: '+iss)
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