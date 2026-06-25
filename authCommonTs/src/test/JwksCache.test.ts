import axios from "axios";
import jwkToPem from "jwk-to-pem";
import { ValidationException } from "../ValidationException";
import { mockJwksResponse, jwksKid } from "./__mock__/jwks.mock";

jest.mock("aws-xray-sdk-core", () => ({
  captureHTTPsGlobal: jest.fn(),
}));

// retryWithDelay is exercised in its own suite; here we collapse it so the
// JWKS fetch runs without retry delays.
jest.mock("../Retry", () => ({
  retryWithDelay: (fn: () => Promise<unknown>) => fn(),
}));

jest.mock("axios");
jest.mock("jwk-to-pem");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedJwkToPem = jwkToPem as jest.MockedFunction<typeof jwkToPem>;

const jwksUrl = "https://uat.oneid.pagopa.it/oidc/keys";
const issuer = "uat.oneid.pagopa.it";
const pemKey = "mocked-pem-key";

// Cache is active by default (CACHE_TTL defaults to 300).
const TTL_MS = 300 * 1000;
const SIX_MINUTES_IN_MS = 360000;

describe("getJwksPublicKey (cache active)", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getJwksPublicKey, clearJwksCache } = require("../JwksCache");

  beforeEach(() => {
    jest.clearAllMocks();
    clearJwksCache();
    jest.useFakeTimers({ now: Date.now() });
    mockedJwkToPem.mockReturnValue(pemKey);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches, converts to PEM and caches on first call", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockJwksResponse });

    const result = await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(result).toEqual(pemKey);
    expect(mockedAxios.get).toHaveBeenCalledWith(jwksUrl, { timeout: 2000 });
    expect(mockedJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);

    // Second call within TTL is served from cache (no extra fetch).
    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it("throws when the fetch fails and the cache is empty", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Internal Server Error"));

    await expect(getJwksPublicKey(jwksUrl, issuer, jwksKid)).rejects.toThrow(
      "Error in get pub key",
    );
  });

  it("refreshes the cache once the entry has expired", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockJwksResponse });

    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    jest.advanceTimersByTime(TTL_MS + SIX_MINUTES_IN_MS);
    await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it("serves the stale value when a refresh fails", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: mockJwksResponse })
      .mockRejectedValueOnce(new Error("Failed to refresh"));

    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    jest.advanceTimersByTime(TTL_MS + SIX_MINUTES_IN_MS);

    const result = await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(result).toEqual(pemKey);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it("logs an error when refresh fails after the two-hour threshold", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockedAxios.get
      .mockResolvedValueOnce({ data: mockJwksResponse })
      .mockRejectedValueOnce(new Error("Failed to refresh"));

    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    jest.advanceTimersByTime(7200000 + TTL_MS + 1000);

    const result = await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(result).toEqual(pemKey);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Couldnt refresh cache in last two hours"),
    );
    consoleErrorSpy.mockRestore();
  });

  it("throws ValidationException when the kid is not found", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockJwksResponse });

    await expect(
      getJwksPublicKey(jwksUrl, issuer, "non-existent-kid"),
    ).rejects.toThrow(
      new ValidationException(
        "Public key with kid non-existent-kid not found in JWKS",
      ),
    );
  });

  it("throws ValidationException when the JWKS has no keys", async () => {
    mockedAxios.get.mockResolvedValue({ data: { keys: [] } });

    await expect(getJwksPublicKey(jwksUrl, issuer, jwksKid)).rejects.toThrow(
      new ValidationException("No keys found in JWKS"),
    );
  });

  it("re-fetches after the cache is cleared", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockJwksResponse });

    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    clearJwksCache();
    await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});

describe("getJwksPublicKey (cache disabled)", () => {
  let getJwksPublicKey: (
    jwksUrl: string,
    issuer: string,
    kid: string,
  ) => Promise<string>;

  beforeAll(() => {
    jest.isolateModules(() => {
      process.env.CACHE_TTL = "0";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      getJwksPublicKey = require("../JwksCache").getJwksPublicKey;
    });
  });

  afterAll(() => {
    delete process.env.CACHE_TTL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedJwkToPem.mockReturnValue(pemKey);
  });

  it("fetches on every call without caching", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockJwksResponse });

    await getJwksPublicKey(jwksUrl, issuer, jwksKid);
    await getJwksPublicKey(jwksUrl, issuer, jwksKid);

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});
