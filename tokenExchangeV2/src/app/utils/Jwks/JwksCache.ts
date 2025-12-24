import { CachedJwks, JWKS } from "../../../models/Jwks";
import { getJwks } from "./JwksRetriever";

const cachedJwks = new Map<string, CachedJwks>();
const TWO_HOURS_IN_MILLISECONDS = 7200000;
const TTL = process.env.CACHE_TTL ? Number(process.env.CACHE_TTL) : 300;

export const isCacheActive = TTL != 0;

export async function get(issuer: string) {
  if (isCacheEmpty(issuer) || isCacheExpired(issuer)) {
    await refreshCache(issuer);
  }
  return cachedJwks.get(issuer);
}

const isCacheEmpty = (issuer: string) => !cachedJwks?.has(issuer);

const isCacheExpired = (issuer: string) => {
  const jwks = cachedJwks.get(issuer);
  return !!jwks && jwks.expiresOn < Date.now();
};

const refreshCache = async (issuer: string) => {
  console.debug(`Starting refresh cache for issuer : ${issuer}`);
  try {
    const jwks = await getJwks();
    setCachedData(jwks, issuer);
  } catch (error) {
    handleCacheRefreshFail(error, issuer);
  }
};

const setCachedData = (jwks: JWKS, issuer: string) => {
  const now = Date.now();

  const value = {
    expiresOn: now + TTL * 1000,
    keys: jwks.keys,
    lastUpdate: now,
  };

  cachedJwks.set(issuer, value);

  console.debug(`Set cached jwks for issuer : ${issuer}`, cachedJwks);
};

const handleCacheRefreshFail = (error: any, issuer: string) => {
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
};

const checkLastUpdateTresholdExceeded = (issuer: string) => {
  const jwks = cachedJwks.get(issuer);
  if (!jwks) {
    return false;
  }
  const treshold = jwks.lastUpdate + TWO_HOURS_IN_MILLISECONDS;
  return jwks.lastUpdate > treshold;
};

export const clearCache = () => cachedJwks.clear();
