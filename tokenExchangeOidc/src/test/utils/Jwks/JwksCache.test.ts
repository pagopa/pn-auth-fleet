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

  it("should handle cache refresh failure when cache is empty", async () => {
    getJwksSpy.mockRejectedValue(new Error("Failed to fetch"));

    await expect(get(issuer)).rejects.toThrow("Failed to fetch");
    expect(getJwksSpy).toHaveBeenCalledTimes(1);
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

  it("should return cached value without refresh when not expired", async () => {
    getJwksSpy.mockResolvedValueOnce(mockJwksResponse);

    // First call
    const jwks = await get(issuer);
    expect(jwks).toBeDefined();
    expect(getJwksSpy).toHaveBeenCalledTimes(1);

    // Second call before expiration
    const secondJwks = await get(issuer);
    expect(secondJwks).toBeDefined();
    expect(secondJwks?.keys).toEqual(mockJwksResponse.keys);

    // Should not call getJwks again since cache is still valid
    expect(getJwksSpy).toHaveBeenCalledTimes(1);
  });

  it("should refresh cache when expired", async () => {
    getJwksSpy
      .mockResolvedValueOnce(mockJwksResponse)
      .mockResolvedValueOnce(mockJwksResponse);

    // First call
    const jwks = await get(issuer);
    expect(jwks).toBeDefined();
    const firstExpiresOn = jwks!.expiresOn;

    // Advance time past expiration
    jest.advanceTimersByTime(SIX_MINUTES_IN_MS);

    // Second call should refresh
    const secondJwks = await get(issuer);
    expect(secondJwks).toBeDefined();
    const secondExpiresOn = secondJwks!.expiresOn;

    // Expiration time should be updated
    expect(secondExpiresOn).toBeGreaterThan(firstExpiresOn);
    expect(getJwksSpy).toHaveBeenCalledTimes(2);
  });

  it("should log error when cache refresh fails and last update threshold exceeded (>2 hours)", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // First call succeeds to populate cache
    getJwksSpy.mockResolvedValueOnce(mockJwksResponse);

    const jwks = await get(issuer);
    expect(jwks).toBeDefined();

    // Advance time by more than 2 hours (7200000 ms) + TTL
    const TWO_HOURS_PLUS_TTL = 7200000 + 300 * 1000 + 1000;
    jest.advanceTimersByTime(TWO_HOURS_PLUS_TTL);

    // Second call fails after threshold exceeded
    getJwksSpy.mockRejectedValueOnce(new Error("Failed to refresh"));

    const secondJwks = await get(issuer);

    // Should return stale cache
    expect(secondJwks).toBeDefined();
    expect(secondJwks?.keys).toEqual(mockJwksResponse.keys);

    // Verify error was logged (not warning)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Couldnt refresh cache in last two hours")
    );

    consoleErrorSpy.mockRestore();
  });
});
