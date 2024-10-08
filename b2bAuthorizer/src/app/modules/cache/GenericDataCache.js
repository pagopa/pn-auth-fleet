const { AllowedIssuerDao } = require('pn-auth-common');
const { SqsHandler } = require('pn-auth-common');
const AuthenticationError = require('../../errors/AuthenticationError');
const crypto = require('crypto');

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

class GenericDatalCache {

    #internalCacheTtlSeconds;
    #cacheStore = new Map();

    constructor(internalCacheTtlSeconds) {
        this.#internalCacheTtlSeconds = internalCacheTtlSeconds;
    }

    #isCacheItemValid(cacheItem, nowInSeconds) {
        const modificationTimeInSeconds = Math.floor(cacheItem.modificationTimeEpochMs);
        return modificationTimeInSeconds > nowInSeconds - this.#internalCacheTtlSeconds;
    }

    getCacheItem(key){
        const cacheItem = this.#cacheStore.get(key);
        if(!cacheItem) {
            return null;
        }
        if(this.#isCacheItemValid(cacheItem, Math.floor(Date.now() / 1000))) {
            return cacheItem.Item;
        }

        return null;
    }

    invalidateCache(key) {
        this.#cacheStore.delete(key);
    }

    setCacheItem(key, item){
        this.#cacheStore.set(key, {Item: item, modificationTimeEpochMs: Math.floor(Date.now() / 1000)});
    }
}

module.exports = GenericDatalCache