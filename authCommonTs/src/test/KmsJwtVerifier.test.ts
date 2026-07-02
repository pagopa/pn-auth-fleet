import { GetPublicKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import jsonwebtoken from "jsonwebtoken";
import { verifyKmsJwt, clearKmsPublicKeyCache } from "../KmsJwtVerifier";
import { ValidationException } from "../ValidationException";

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    decode: jest.fn(),
    verify: jest.fn(),
  },
}));

const decodeMock = jsonwebtoken.decode as jest.Mock;
const verifyMock = jsonwebtoken.verify as jest.Mock;

const kmsMock = mockClient(KMSClient);

const fakePublicKey = new Uint8Array([1, 2, 3, 4]);
const fakePublicKeyB64 = Buffer.from(fakePublicKey).toString("base64");
const expectedPem = `-----BEGIN PUBLIC KEY-----\n${fakePublicKeyB64}\n-----END PUBLIC KEY-----`;

const decodedToken = {
  header: { alg: "RS256", typ: "JWT", kid: "test-key-id" },
  payload: { uid: "cx-123", state: "st-1", iat: 1, exp: 9999999999 },
};

describe("verifyKmsJwt", () => {
  beforeEach(() => {
    kmsMock.reset();
    clearKmsPublicKeyCache();
    decodeMock.mockReturnValue(decodedToken);
    verifyMock.mockReturnValue(undefined);
    kmsMock.on(GetPublicKeyCommand).resolves({ PublicKey: fakePublicKey });
  });

  it("should resolve the public key from the kid, verify, and return the payload", async () => {
    const payload = await verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 });

    expect(payload).toEqual(decodedToken.payload);
    expect(kmsMock.commandCalls(GetPublicKeyCommand)).toHaveLength(1);
    expect(kmsMock.commandCalls(GetPublicKeyCommand)[0].args[0].input).toEqual({
      KeyId: "test-key-id",
    });
    expect(verifyMock).toHaveBeenCalledWith("a.b.c", expectedPem);
  });

  it("should cache the public key across calls (single KMS fetch)", async () => {
    await verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 });
    await verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 });

    expect(kmsMock.commandCalls(GetPublicKeyCommand)).toHaveLength(1);
  });

  it("should fetch on every call when caching is disabled (cacheTTL 0)", async () => {
    await verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 0 });
    await verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 0 });

    expect(kmsMock.commandCalls(GetPublicKeyCommand)).toHaveLength(2);
  });

  it("should throw ValidationException when the JWT cannot be decoded", async () => {
    decodeMock.mockReturnValue(null);

    await expect(verifyKmsJwt({ jwt: "bad", cacheTTL: 3600 })).rejects.toThrow(ValidationException);
  });

  it("should throw ValidationException when the header has no kid", async () => {
    decodeMock.mockReturnValue({ header: { alg: "RS256" }, payload: {} });

    await expect(verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 })).rejects.toThrow("missing kid");
  });

  it("should throw ValidationException when KMS returns no public key", async () => {
    kmsMock.on(GetPublicKeyCommand).resolves({ PublicKey: undefined });

    await expect(verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 })).rejects.toThrow(
      "empty public key",
    );
  });

  it("should wrap signature verification failures in a ValidationException", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    await expect(verifyKmsJwt({ jwt: "a.b.c", cacheTTL: 3600 })).rejects.toThrow(ValidationException);
  });
});
