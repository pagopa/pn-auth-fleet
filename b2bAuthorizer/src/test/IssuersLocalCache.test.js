const rewire = require('rewire');
const { expect } = require("chai");
const IssuerNotFoundError = require('pn-auth-common/app/modules/dao/IssuerNotFoundError');

describe('IssuersLocalCache', () => {
  it('getOrLoad should throw an AuthenticationERror if AllowedIssuerDao returns IssuerNotFoundError', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => {
        throw new IssuerNotFoundError('No Issuer configuration found for '+iss);
      }
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);
    const cache = new IssuersLocalCache(100, 100);
    try {
      await cache.getOrLoad('iss');
    } catch (e) {
      expect(e.name).to.equal('AuthenticationError');
    }
  });

  it('getOrLoad should throw a generic error if AllowedIssuerDao returns null', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => {
        return null
      }
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);
    const cache = new IssuersLocalCache(100, 100);
    try {
      await cache.getOrLoad('iss');
    } catch (e) {
      expect(e.message).to.equal('Unable to get issuer info and jwks cache for iss');
    }
  });

  it('getOrLoad should return cacheItem if it is valid', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    const now = Date.now();
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          modificationTimeEpochMs: now
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);
    const cache = new IssuersLocalCache(100, 100);
    const cacheItem = await cache.getOrLoad('iss');
    expect(cacheItem).to.deep.equal({
      cfg: {
        modificationTimeEpochMs: now
      }
    });
  });

  it('getOrLoad should return new Item it cacheItem is not valid', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    
    const modificationTimeEpochMs = Date.now()
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          modificationTimeEpochMs: modificationTimeEpochMs-10
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);

    const cache = new IssuersLocalCache(100, 100);
    
    const oldItem = await cache.getOrLoad('issKey');
    oldItem.cfg.modificationTimeEpochMs = Date.now()-1000000;

    const AllowedIssuerDao1 = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          modificationTimeEpochMs: modificationTimeEpochMs
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao1);

    const cacheItem = await cache.getOrLoad('issKey');
    expect(cacheItem).to.deep.equal({
      cfg: {
        hashKey: 'ISS~issKey',
        modificationTimeEpochMs: modificationTimeEpochMs
      }
    });

  });


  it('getOrLoad should return cached item', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    
    const modificationTimeEpochMs = Date.now()
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          modificationTimeEpochMs: modificationTimeEpochMs-10
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);

    const cache = new IssuersLocalCache(100, 100);
    
    const oldItem = await cache.getOrLoad('issKey');

    expect(oldItem).to.deep.equal({
      cfg: {
        hashKey: 'ISS~issKey',
        modificationTimeEpochMs: modificationTimeEpochMs-10
      }
    });

    const AllowedIssuerDao1 = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          modificationTimeEpochMs: modificationTimeEpochMs-10000
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao1);

    const cacheItem = await cache.getOrLoad('issKey');
    expect(cacheItem).to.deep.equal({
      cfg: {
        hashKey: 'ISS~issKey',
        modificationTimeEpochMs: modificationTimeEpochMs-10
      }
    });

  });

  it('getOrLoad should return new Item it cacheItem is not valid', async () => {
    const IssuersLocalCache = rewire('../app/modules/cache/IssuersLocalCache');
    
    const modificationTimeEpochMs = Date.now()
    const AllowedIssuerDao = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          cached: true,
          modificationTimeEpochMs: modificationTimeEpochMs
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao);
    const cache = new IssuersLocalCache(100, 100);
    const cacheItem1 = await cache.getOrLoad('issKey');

    // the second type 
    expect(cacheItem1).to.deep.equal({
      cfg: {
        hashKey: 'ISS~issKey',
        cached: true,
        modificationTimeEpochMs: modificationTimeEpochMs
      }
    });

    const AllowedIssuerDao1 = {
      getIssuerInfoAndJwksCache: async (iss, renewTimeSeconds) => ({
        cfg: {
          hashKey: 'ISS~issKey',
          cached: false,
          modificationTimeEpochMs: modificationTimeEpochMs
        }
      })
    }
    IssuersLocalCache.__set__('AllowedIssuerDao', AllowedIssuerDao1);

    const cacheItem = await cache.getWithForceRefresh('issKey');

    // the second type 
    expect(cacheItem).to.deep.equal({
      cfg: {
        hashKey: 'ISS~issKey',
        cached: false,
        modificationTimeEpochMs: modificationTimeEpochMs
      }
    });

  });
  
})