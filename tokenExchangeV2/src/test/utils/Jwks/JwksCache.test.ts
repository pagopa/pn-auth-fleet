import {
  clearCache,
  get,
  isCacheActive,
} from "../../../app/utils/Jwks/JwksCache";
import * as retrieverJwks from "../../../app/utils/Jwks/JwksRetriever";
import { mockJwksResponse } from "../../__mock__/jwks.mock";

const SIX_MINUTES_IN_MS = process.env.CACHE_TTL
  ? Number(process.env.CACHE_TTL) * 1000 + 360000
  : 360000 + 300 * 1000;

describe("test jwksCache", () => {
  const issuer = "uat.oneid.pagopa.it";
  let getJwksSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.CACHE_TTL = "300";
  });

  afterAll(() => {
    delete process.env.CACHE_TTL;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    clearCache();
    jest.useFakeTimers({ now: Date.now(), advanceTimers: true });
    getJwksSpy = jest.spyOn(retrieverJwks, "getJwks");
  });

  afterEach(() => {
    jest.useRealTimers();
    getJwksSpy.mockRestore();
  });

  it("initialize cache when is empty", async () => {
    getJwksSpy.mockResolvedValue(mockJwksResponse);

    const jwks = await get(issuer);

    expect(jwks).toBeDefined();
    expect(jwks?.keys).toEqual(mockJwksResponse.keys);
    expect(jwks?.expiresOn).toBeDefined();
    expect(jwks?.lastUpdate).toBeDefined();
    expect(isCacheActive).toBe(true);
  });

  it("error initializing cache", async () => {
    getJwksSpy.mockRejectedValue(new Error("Failed to fetch"));

    await expect(get(issuer)).rejects.toThrow();
  });

  it("error refreshing cache", async () => {
    getJwksSpy
      .mockResolvedValueOnce(mockJwksResponse)
      .mockRejectedValueOnce(new Error("Failed to refresh"));

    const jwks = await get(issuer);

    expect(jwks).toBeDefined();
    const firstExpiresOn = jwks!.expiresOn;

    expect(jwks!.keys).toEqual(mockJwksResponse.keys);
    expect(firstExpiresOn).toBeDefined();
    expect(jwks!.lastUpdate).toBeDefined();

    // advance time to simulate expiration
    jest.advanceTimersByTime(SIX_MINUTES_IN_MS);

    // Check expiration
    const now = Date.now();
    const isCacheExpired = firstExpiresOn < now;
    expect(isCacheExpired).toBe(true);

    // Obtain old cache value (should not throw, returns stale data)
    const secondJwks = await get(issuer);

    expect(secondJwks).toBeDefined();
    const secondExpiresOn = secondJwks!.expiresOn;

    // The cache should return the OLD cached value since refresh failed
    expect(firstExpiresOn).toEqual(secondExpiresOn);

    // Verify getJwks was called twice (initial + failed refresh)
    expect(getJwksSpy).toHaveBeenCalledTimes(2);
  });
});
