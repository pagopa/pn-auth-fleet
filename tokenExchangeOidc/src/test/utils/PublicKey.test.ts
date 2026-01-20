import jwkToPem from "jwk-to-pem";
import { ValidationException } from "../../app/exception/validationException";
import * as JwksCache from "../../app/utils/Jwks/JwksCache";
import { get } from "../../app/utils/Jwks/JwksCache";
import { getJwks } from "../../app/utils/Jwks/JwksRetriever";
import { getPublicKeys } from "../../app/utils/PublicKey";
import { mockCacheJwksResponse, mockJwksResponse } from "../__mock__/jwks.mock";

jest.mock("../../app/utils/Jwks/JwksCache");
jest.mock("../../app/utils/Jwks/JwksRetriever");
jest.mock("jwk-to-pem");

const mockGet = get as jest.MockedFunction<typeof get>;
const mockGetJwks = getJwks as jest.MockedFunction<typeof getJwks>;
const mockJwkToPem = jwkToPem as jest.MockedFunction<typeof jwkToPem>;

describe("getPublicKeys", () => {
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

      const result = await getPublicKeys(testIssuer);

      expect(result).toEqual([mockPemKey]);
      expect(mockGet).toHaveBeenCalledWith(testIssuer);
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGetJwks).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when key not found in cache", async () => {
      mockGet.mockResolvedValue(undefined);

      await expect(getPublicKeys(testIssuer)).rejects.toThrow(
        new ValidationException("Public key not found in cache")
      );
    });

    it("should retrieve all public keys from cache when multiple keys exist", async () => {
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

      mockGet.mockResolvedValue(multiKeyJwks);
      mockJwkToPem
        .mockReturnValueOnce("pem-key-1")
        .mockReturnValueOnce("pem-key-2");

      const result = await getPublicKeys(testIssuer);

      expect(result).toEqual(["pem-key-1", "pem-key-2"]);
      expect(mockJwkToPem).toHaveBeenCalledTimes(2);
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

      const result = await getPublicKeys(testIssuer);

      expect(result).toEqual([mockPemKey]);
      expect(mockGetJwks).toHaveBeenCalled();
      expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("should throw ValidationException when JWKS has no keys", async () => {
      mockGetJwks.mockResolvedValue({ keys: [] });

      await expect(getPublicKeys(testIssuer)).rejects.toThrow(
        new ValidationException("No keys found in JWKS")
      );
    });
  });
});
