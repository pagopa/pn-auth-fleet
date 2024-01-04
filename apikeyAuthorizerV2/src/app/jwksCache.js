// for testing purpose, we mustn't destructure the import; stub doesn't mock destructure object
const retrieverPdndJwks = require("./retrieverPdndJwks.js");

let cachedJwks = null;
const TWO_HOURS_IN_MILLISECONDS = 7200000;
const TTL = process.env.CACHE_TTL ? Number(process.env.CACHE_TTL) : 300;

async function get() {
  if (isCacheEmpty() || isCacheExpired()) {
    await refreshCache();
  }
  return cachedJwks;
}

function isCacheActive() {
  return TTL !== 0;
}

function isCacheEmpty() {
  return !cachedJwks || !cachedJwks.expiresOn || !cachedJwks.keys;
}

function isCacheExpired() {
  return cachedJwks.expiresOn < Date.now();
}

async function refreshCache() {
  console.debug("Starting refresh cache");
  try {
    const jwks = await retrieverPdndJwks.getJwks(process.env.PDND_ISSUER);
    setCachedData(jwks);
  } catch (error) {
    handleCacheRefreshFail(error);
  }
}

function setCachedData(jwks) {
  const now = Date.now();

  cachedJwks = {
    expiresOn: now + TTL * 1000,
    keys: jwks.keys,
    lastUpdate: now,
  };

  console.debug("Set cached jwks");
}

function handleCacheRefreshFail(error) {
  if (isCacheEmpty()) {
    throw error;
  }

  if (checkLastUpdateTresholdExceeded()) {
    console.error(
      "Couldnt refresh cache in last two hours, old value will be used"
    );
  } else {
    console.warn("Error refreshing cache, old value will be used");
  }
}

function checkLastUpdateTresholdExceeded() {
  const treshold = cachedJwks.lastUpdate + TWO_HOURS_IN_MILLISECONDS;
  return cachedJwks.lastUpdate > treshold;
}

module.exports = { get, isCacheActive };
