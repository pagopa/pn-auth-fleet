import jwkToPem from "jwk-to-pem";
import { ValidationException } from "../../app/exception/validationException";
import * as JwksCache from "../../app/utils/Jwks/JwksCache";
import { get } from "../../app/utils/Jwks/JwksCache";
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

    it("should retrieve public key from cache successfully", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);

      const result = await getPublicKey(testIssuer, jwksKid);

      expect(result).toEqual(mockPemKey);
      expect(mockGet).toHaveBeenCalledWith(testIssuer);
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGetJwks).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when key not found in cache", async () => {
      mockGet.mockResolvedValue(undefined);

      await expect(getPublicKey(testIssuer, jwksKid)).rejects.toThrow(
        new ValidationException("Public key not found in cache"),
      );
    });

    it("should throw ValidationException when key with specified kid not found in cache", async () => {
      mockGet.mockResolvedValue(mockCacheJwksResponse);

      await expect(
        getPublicKey(testIssuer, "non-existent-kid"),
      ).rejects.toThrow(
        new ValidationException(
          "Public key with kid non-existent-kid not found in JWKS",
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

    it("should retrieve public key without cache successfully", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);

      const result = await getPublicKey(testIssuer, jwksKid);

      expect(result).toEqual(mockPemKey);
      expect(mockGetJwks).toHaveBeenCalled();
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when JWKS has no keys", async () => {
      mockGetJwks.mockResolvedValue({ keys: [] });

      await expect(getPublicKey(testIssuer, jwksKid)).rejects.toThrow(
        new ValidationException("No keys found in JWKS"),
      );
    });

    it("should throw ValidationException when key with specified kid not found in JWKS", async () => {
      mockGetJwks.mockResolvedValue(mockJwksResponse);

      await expect(
        getPublicKey(testIssuer, "non-existent-kid"),
      ).rejects.toThrow(
        new ValidationException(
          "Public key with kid non-existent-kid not found in JWKS",
        ),
      );
    });
  });
});
