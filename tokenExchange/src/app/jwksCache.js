const retrieverJwks = require("./retrieverJwks.js");

/* 
  Map structure : { 
    issuer1: {keys: [...], expiresOn: ..., lastUpdate: ...}, 
    issuer2: {keys: [...], expiresOn: ..., lastUpdate: ...}
    ...
  } 
*/
let cachedJwks = new Map();
const TWO_HOURS_IN_MILLISECONDS = 7200000;
const TTL = process.env.CACHE_TTL ? Number(process.env.CACHE_TTL) : 300;

module.exports = {
  async get(issuer) {
    if (isCacheEmpty(issuer) || isCacheExpired(issuer)) {
      await refreshCache(issuer);
    }
    return cachedJwks.get(issuer);
  },
  isCacheActive() {
    return TTL != 0;
  },
};

function isCacheEmpty(issuer) {
  return !cachedJwks || !cachedJwks.has(issuer);
}

function isCacheExpired(issuer) {
  let jwks = cachedJwks.get(issuer);
  return jwks.expiresOn < Date.now();
}

async function refreshCache(issuer) {
  console.debug(`Starting refresh cache for issuer : ${issuer}`);
  try {
    const jwks = await retrieverJwks.getJwks(issuer);
    setCachedData(jwks, issuer);
  } catch (error) {
    handleCacheRefreshFail(error, issuer);
  }
}

const setCachedData = (jwks, issuer) => {
  const now = Date.now();

  const value = {
    expiresOn: now + TTL * 1000,
    keys: jwks.keys,
    lastUpdate: now,
  };

  cachedJwks.set(issuer, value);

  console.debug(`Set cached jwks for issuer : ${issuer}`, cachedJwks);
};

function handleCacheRefreshFail(error, issuer) {
  if (isCacheEmpty(issuer)) {
    throw error;
  }

  if (checkLastUpdateTresholdExceeded(issuer)) {
    console.error(
      `Couldnt refresh cache in last two hours for issuer : ${issuer}, old value will be used`
    );
  } else {
    console.warn(
      `Error refreshing cache for issuer : ${issuer}, old value will be used`
    );
  }
}

function checkLastUpdateTresholdExceeded(issuer) {
  let jwks = cachedJwks.get(issuer);
  const treshold = jwks.lastUpdate + TWO_HOURS_IN_MILLISECONDS;
  return jwks.lastUpdate > treshold;
}
