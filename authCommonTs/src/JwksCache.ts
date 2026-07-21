import AWSXRay from "aws-xray-sdk-core";
import http from "node:http";
import https from "node:https";
import axios from "axios";
import jwkToPem from "jwk-to-pem";

import { CachedJwks, JWKS } from "./Jwks";
import { retryWithDelay } from "./Retry";
import { ValidationException } from "./ValidationException";

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

const DEFAULT_TIMEOUT = 2000;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;
const TWO_HOURS_IN_MILLISECONDS = 7200000;

const cachedJwks = new Map<string, CachedJwks>();

type GetJwksPublicKeyProps = {
  /** Full URL of the JWKS endpoint to fetch from */
  jwksUrl: string;
  /** Issuer the JWKS belongs to, used as cache key */
  issuer: string;
  /** Key id of the JWK to resolve */
  kid: string;
  /** Cache TTL in seconds, provided by the caller (0 disables caching) */
  cacheTTL: number;
};

/**
 * Resolves the PEM public key for the given `kid` from the JWKS published at
 * `jwksUrl`. Results are cached per `issuer` for `cacheTTL` seconds (pass 0 to
 * disable caching); if a refresh fails, a stale value is served for up to two
 * hours.
 */
export async function getJwksPublicKey({
  jwksUrl,
  issuer,
  kid,
  cacheTTL,
}: GetJwksPublicKeyProps): Promise<string> {
  const jwks =
    cacheTTL > 0
      ? await getFromCache(issuer, jwksUrl, cacheTTL)
      : await getJwks(jwksUrl);

  if (!jwks) {
    throw new ValidationException("Public key not found in cache");
  }

  return getKeyFromJwks(jwks, kid);
}

export const clearJwksCache = () => cachedJwks.clear();

async function innerGetJwks(jwksUrl: string): Promise<JWKS> {
  console.info("Fetching JWKS from:", jwksUrl);

  try {
    const response = await axios.get<JWKS>(jwksUrl, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  } catch (error) {
    console.warn("Error fetching JWKS:", error);
    throw new Error("Error in get pub key");
  }
}

async function getJwks(jwksUrl: string): Promise<JWKS> {
  return retryWithDelay<JWKS>(() => innerGetJwks(jwksUrl), RETRY_DELAY, MAX_RETRIES);
}

async function getFromCache(
  issuer: string,
  jwksUrl: string,
  cacheTTL: number,
): Promise<JWKS | undefined> {
  if (isCacheEmpty(issuer) || isCacheExpired(issuer)) {
    await refreshCache(issuer, jwksUrl, cacheTTL);
  }
  return cachedJwks.get(issuer);
}

const isCacheEmpty = (issuer: string) => !cachedJwks.has(issuer);

const isCacheExpired = (issuer: string) => {
  const jwks = cachedJwks.get(issuer);
  return !!jwks && jwks.expiresOn < Date.now();
};

const refreshCache = async (issuer: string, jwksUrl: string, cacheTTL: number) => {
  console.debug(`Starting refresh cache for issuer : ${issuer}`);
  try {
    const jwks = await getJwks(jwksUrl);
    setCachedData(jwks, issuer, cacheTTL);
  } catch (error) {
    handleCacheRefreshFail(error, issuer);
  }
};

const setCachedData = (jwks: JWKS, issuer: string, cacheTTL: number) => {
  const now = Date.now();

  cachedJwks.set(issuer, {
    expiresOn: now + cacheTTL * 1000,
    keys: jwks.keys,
    lastUpdate: now,
  });

  console.debug(`Set cached jwks for issuer : ${issuer}`, cachedJwks);
};

const handleCacheRefreshFail = (error: any, issuer: string) => {
  if (isCacheEmpty(issuer)) {
    throw error;
  }

  if (checkLastUpdateThresholdExceeded(issuer)) {
    console.error(`Couldnt refresh cache in last two hours for issuer : ${issuer}, old value will be used`);
  } else {
    console.warn(`Error refreshing cache for issuer : ${issuer}, old value will be used`);
  }
};

const checkLastUpdateThresholdExceeded = (issuer: string) => {
  const jwks = cachedJwks.get(issuer);
  if (!jwks) {
    return false;
  }
  const threshold = jwks.lastUpdate + TWO_HOURS_IN_MILLISECONDS;
  return Date.now() > threshold;
};

function getKeyFromJwks(jwks: JWKS, kid: string): string {
  if (!jwks.keys || jwks.keys.length === 0) {
    throw new ValidationException("No keys found in JWKS");
  }

  const jwk = jwks.keys.find((key) => key.kid === kid);

  if (!jwk) {
    throw new ValidationException(`Public key with kid ${kid} not found in JWKS`);
  }

  return jwkToPem(jwk);
}
