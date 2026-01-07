// import { ValidationException } from "../../app/exception/validationException";
// import { get, isCacheActive } from "../../app/utils/Jwks/JwksCache";
// import { getJwks } from "../../app/utils/Jwks/JwksRetriever";
// import { getPublicKey } from "../../app/utils/PublicKey";
// import { mockJwksResponse } from "../__mock__/jwks.mock";

// jest.mock("./Jwks/JwksCache");
// jest.mock("./Jwks/JwksRetriever");
// jest.mock("jwk-to-pem");

// const mockGet = get as jest.MockedFunction<typeof get>;
// const mockGetJwks = getJwks as jest.MockedFunction<typeof getJwks>;
// const mockJwkToPem = jwkToPem as jest.MockedFunction<typeof jwkToPem>;

// describe("getPublicKey", () => {
//   const testIssuer = "https://test-issuer.com";
//   const testKid = "test-key-id";

//   const mockPemKey =
//     "-----BEGIN PUBLIC KEY-----\nMockPemKey\n-----END PUBLIC KEY-----";

//   beforeEach(() => {
//     jest.clearAllMocks();
//     mockJwkToPem.mockReturnValue(mockPemKey);
//   });

//   describe("with cache active", () => {
//     beforeEach(() => {
//       (isCacheActive as any) = true;
//     });

//     test("should retrieve public key from cache successfully", async () => {
//       mockGet.mockResolvedValue(mockJwksResponse);

//       const result = await getPublicKey(testIssuer, testKid);

//       expect(result).toBe(mockPemKey);
//       expect(mockGet).toHaveBeenCalledWith(testIssuer);
//       expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
//       expect(mockGetJwks).not.toHaveBeenCalled();
//     });

//     test("should throw ValidationException when key not found in cache", async () => {
//       mockGet.mockResolvedValue(null);

//       await expect(getPublicKey(testIssuer, testKid)).rejects.toThrow(
//         new ValidationException("Public key not found in cache")
//       );
//     });

//     test("should throw ValidationException when kid not found in JWKS", async () => {
//       mockGet.mockResolvedValue(mockJwksResponse);

//       await expect(
//         getPublicKey(testIssuer, "non-existent-kid")
//       ).rejects.toThrow(new ValidationException("Public key not found"));
//     });
//   });

//   describe("without cache", () => {
//     beforeEach(() => {
//       (isCacheActive as any) = false;
//     });

//     test("should retrieve public key without cache successfully", async () => {
//       mockGetJwks.mockResolvedValue(mockJwksResponse);

//       const result = await getPublicKey(testIssuer, testKid);

//       expect(result).toBe(mockPemKey);
//       expect(mockGetJwks).toHaveBeenCalled();
//       expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[0]);
//       expect(mockGet).not.toHaveBeenCalled();
//     });

//     test("should throw ValidationException when kid not found", async () => {
//       mockGetJwks.mockResolvedValue(mockJwksResponse);

//       await expect(
//         getPublicKey(testIssuer, "non-existent-kid")
//       ).rejects.toThrow(new ValidationException("Public key not found"));
//     });

//     test("should find correct key when multiple keys exist", async () => {
//       mockGetJwks.mockResolvedValue(mockJwksResponse);

//       const result = await getPublicKey(testIssuer, "another-key-id");

//       expect(result).toBe(mockPemKey);
//       expect(mockJwkToPem).toHaveBeenCalledWith(mockJwksResponse.keys[1]);
//     });
//   });
// });
