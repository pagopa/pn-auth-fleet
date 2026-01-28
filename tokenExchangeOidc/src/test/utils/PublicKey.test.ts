import jwkToPem from "jwk-to-pem";
import { ValidationException } from "../../app/exception/validationException";
import * as JwksCache from "../../app/utils/Jwks/JwksCache";
import { get } from "../../app/utils/Jwks/JwksCache";
import { getJwks } from "../../app/utils/Jwks/JwksRetriever";
import { getPublicKeys } from "../../app/utils/PublicKey";
import {
  jwksKid,
  mockCacheJwksResponse,
  mockJwksResponse,
} from "../__mock__/jwks.mock";

jest.mock("../../app/utils/Jwks/JwksCache");
jest.mock("../../app/utils/Jwks/JwksRetriever");
jest.mock("jwk-to-pem");

const mockGet = get as jest.MockedFunction<typeof get>;
const mockGetJwks = getJwks as jest.MockedFunction<typeof getJwks>;
const mockJwkToPem = jwkToPem as jest.MockedFunction<typeof jwkToPem>;

const multiKeyJwks = {
  ...mockCacheJwksResponse,
  keys: [
    mockCacheJwksResponse.keys[0],
    {
      kty: "RSA" as const,
      kid: "key2",
      use: "sig",
      alg: "RS256",
      n: "modulus2",
      e: "AQAB",
    },
  ],
};

describe("getPublicKeys", () => {
  const testIssuer = "https://test-issuer.com";
  const mockPemKey = "mocked-pem-key";
  const mockPemKey2 = "mocked-pem-key-2";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe("with cache active", () => {
    beforeEach(() => {
      Object.defineProperty(JwksCache, "isCacheActive", {
        value: true,
      });
    });

    it("should retrieve specific public key from cache when kid is provided", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);
      mockJwkToPem.mockReturnValue(mockPemKey);

      const result = await getPublicKeys(testIssuer, jwksKid);

      expect(result).toEqual([mockPemKey]);
      expect(result).toHaveLength(1);
      expect(mockGet).toHaveBeenCalledWith(testIssuer);
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGetJwks).not.toHaveBeenCalled();
    });

    it("should retrieve all public keys from cache when kid is undefined", async () => {
      mockGet.mockResolvedValue(multiKeyJwks);
      mockJwkToPem
        .mockReturnValueOnce(mockPemKey)
        .mockReturnValueOnce(mockPemKey2);

      const result = await getPublicKeys(testIssuer);

      expect(result).toEqual([mockPemKey, mockPemKey2]);
      expect(result).toHaveLength(multiKeyJwks.keys.length);
      expect(mockGet).toHaveBeenCalledWith(testIssuer);
      expect(mockJwkToPem).toHaveBeenCalledTimes(multiKeyJwks.keys.length);
      expect(mockGetJwks).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when key not found in cache", async () => {
      mockGet.mockResolvedValue(undefined);

      await expect(getPublicKeys(testIssuer, jwksKid)).rejects.toThrow(
        new ValidationException("Public key not found in cache"),
      );
    });

    it("should throw ValidationException when key with specified kid not found in cache", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);

      await expect(
        getPublicKeys(testIssuer, "non-existent-kid"),
      ).rejects.toThrow(
        new ValidationException(
          "Key with kid 'non-existent-kid' not found in JWKS",
        ),
      );
    });
  });

  describe("without cache", () => {
    beforeEach(() => {
      Object.defineProperty(JwksCache, "isCacheActive", {
        value: false,
      });
    });

    it("should retrieve specific public key without cache when kid is provided", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);
      mockJwkToPem.mockReturnValue(mockPemKey);

      const result = await getPublicKeys(testIssuer, jwksKid);

      expect(result).toEqual([mockPemKey]);
      expect(result).toHaveLength(1);
      expect(mockGetJwks).toHaveBeenCalled();
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("should retrieve all public keys without cache when kid is undefined", async () => {
      mockGetJwks.mockResolvedValue(multiKeyJwks);
      mockJwkToPem
        .mockReturnValueOnce(mockPemKey)
        .mockReturnValueOnce(mockPemKey2);

      const result = await getPublicKeys(testIssuer);

      expect(result).toEqual([mockPemKey, mockPemKey2]);
      expect(result).toHaveLength(multiKeyJwks.keys.length);
      expect(mockGetJwks).toHaveBeenCalled();
      expect(mockJwkToPem).toHaveBeenCalledTimes(multiKeyJwks.keys.length);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when JWKS has no keys", async () => {
      mockGetJwks.mockResolvedValue({ keys: [] });

      await expect(getPublicKeys(testIssuer, jwksKid)).rejects.toThrow(
        new ValidationException("No keys found in JWKS"),
      );
    });

    it("should throw ValidationException when key with specified kid not found in JWKS", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);

      await expect(
        getPublicKeys(testIssuer, "non-existent-kid"),
      ).rejects.toThrow(
        new ValidationException(
          "Key with kid 'non-existent-kid' not found in JWKS",
        ),
      );
    });
  });
});
