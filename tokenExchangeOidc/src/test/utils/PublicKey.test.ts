import jwkToPem from "jwk-to-pem";
import { ValidationException } from "../../app/exception/validationException";
import { get } from "../../app/utils/Jwks/JwksCache";
import * as JwksCache from "../../app/utils/Jwks/JwksCache";
import { getJwks } from "../../app/utils/Jwks/JwksRetriever";
import { getPublicKey } from "../../app/utils/PublicKey";
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

describe("getPublicKey", () => {
  const testIssuer = "https://test-issuer.com";
  const mockPemKey = "mocked-pem-key";

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwkToPem.mockReturnValue(mockPemKey);
  });

  describe("with cache active", () => {
    beforeEach(() => {
      Object.defineProperty(JwksCache, "isCacheActive", {
        value: true,
      });
    });

    test("should retrieve public key from cache successfully", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);

      const result = await getPublicKey(testIssuer, jwksKid);

      expect(result).toBe(mockPemKey);
      expect(mockGet).toHaveBeenCalledWith(testIssuer);
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGetJwks).not.toHaveBeenCalled();
    });

    test("should throw ValidationException when key not found in cache", async () => {
      mockGet.mockResolvedValue(undefined);

      await expect(getPublicKey(testIssuer, jwksKid)).rejects.toThrow(
        new ValidationException("Public key not found in cache")
      );
    });

    test("should throw ValidationException when kid not found in JWKS", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);

      await expect(
        getPublicKey(testIssuer, "non-existent-kid")
      ).rejects.toThrow(new ValidationException("Public key not found"));
    });
  });

  describe("without cache", () => {
    beforeEach(() => {
      Object.defineProperty(JwksCache, "isCacheActive", {
        value: false,
      });
    });

    test("should retrieve public key without cache successfully", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);

      const result = await getPublicKey(testIssuer, jwksKid);

      expect(result).toBe(mockPemKey);
      expect(mockGetJwks).toHaveBeenCalled();
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    test("should throw ValidationException when kid not found", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);

      await expect(
        getPublicKey(testIssuer, "non-existent-kid")
      ).rejects.toThrow(new ValidationException("Public key not found"));
    });

    test("should find correct key when multiple keys exist", async () => {
      const multipleKeysJwks = {
        keys: [
          {
            kty: "RSA" as const,
            kid: "key1",
            use: "sig",
            alg: "RS256",
            n: "modulus1",
            e: "AQAB",
          },
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
      mockGetJwks.mockResolvedValue(multipleKeysJwks);
      mockJwkToPem.mockReturnValue("MockPemKeyForKey2");
      const result = await getPublicKey(testIssuer, "key2");

      expect(result).toBe("MockPemKeyForKey2");
      expect(mockJwkToPem).toHaveBeenCalledWith(multipleKeysJwks.keys[1]);
    });
  });
});
