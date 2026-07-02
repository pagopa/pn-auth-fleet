import { decode, verify } from "jsonwebtoken";
import { ValidationException } from "pn-auth-common-ts";
import { validateFimsIdToken } from "../../app/handlers/fimsToken/validation/TokenValidation";
import { getPublicKey } from "../../app/handlers/fimsToken/utils/PublicKey";
import { setupEnv } from "../test.utils";

jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

jest.mock("../../app/handlers/fimsToken/utils/PublicKey", () => ({
  getPublicKey: jest.fn(),
}));

const decodeMock = decode as jest.Mock;
const verifyMock = verify as jest.Mock;
const getPublicKeyMock = getPublicKey as jest.Mock;

const FIMS_ISSUER = "https://oauth.io.pagopa.it";
const fimsClientId = "fake-client-id";
const nonce = "fake-nonce";

// A well-formed decoded id_token that passes every claim check.
const validPayload = {
  sub: "AAAAAA00A00A000A",
  aud: fimsClientId,
  iss: FIMS_ISSUER,
  exp: 9999999999,
  iat: 1,
  nonce,
};
const validDecodedToken = {
  header: { alg: "RS256", kid: "test-kid" },
  payload: validPayload,
  signature: "sig",
};

const callValidate = () => validateFimsIdToken({ fimsIdToken: "a.b.c", nonce, fimsClientId });

describe("validateFimsIdToken", () => {
  beforeEach(() => {
    setupEnv();
    decodeMock.mockReset();
    verifyMock.mockReset();
    getPublicKeyMock.mockReset();

    decodeMock.mockReturnValue(validDecodedToken);
    getPublicKeyMock.mockResolvedValue("fake-pem");
    verifyMock.mockReturnValue(undefined);
  });

  it("should return the payload on a fully valid token", async () => {
    const result = await callValidate();

    expect(result).toEqual(validPayload);
    expect(decodeMock).toHaveBeenCalledWith("a.b.c", { complete: true });
    expect(getPublicKeyMock).toHaveBeenCalledWith(FIMS_ISSUER, "test-kid");
    expect(verifyMock).toHaveBeenCalledWith("a.b.c", "fake-pem");
  });

  it("should throw when the token cannot be decoded", async () => {
    decodeMock.mockReturnValue(null);

    await expect(callValidate()).rejects.toThrow(ValidationException);
    await expect(callValidate()).rejects.toThrow("Token is not valid");
  });

  it("should throw when the algorithm is not RS256", async () => {
    decodeMock.mockReturnValue({
      ...validDecodedToken,
      header: { alg: "HS256", kid: "test-kid" },
    });

    await expect(callValidate()).rejects.toThrow("Invalid algorithm");
  });

  it("should throw when the issuer is not the FIMS issuer", async () => {
    decodeMock.mockReturnValue({
      ...validDecodedToken,
      payload: { ...validPayload, iss: "https://evil.example.com" },
    });

    await expect(callValidate()).rejects.toThrow("Issuer not known");
  });

  it("should throw when the audience is not the FIMS client id", async () => {
    decodeMock.mockReturnValue({
      ...validDecodedToken,
      payload: { ...validPayload, aud: "another-client" },
    });

    await expect(callValidate()).rejects.toThrow("Invalid Audience");
  });

  it("should throw when the nonce does not match", async () => {
    decodeMock.mockReturnValue({
      ...validDecodedToken,
      payload: { ...validPayload, nonce: "different-nonce" },
    });

    await expect(callValidate()).rejects.toThrow("Invalid nonce");
  });

  it("should throw a ValidationException carrying the verify error message", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    await expect(callValidate()).rejects.toThrow(ValidationException);
    await expect(callValidate()).rejects.toThrow("invalid signature");
  });

  it("should wrap public key retrieval failures in a ValidationException", async () => {
    getPublicKeyMock.mockRejectedValue(new Error("kid not found"));

    await expect(callValidate()).rejects.toThrow(ValidationException);
    await expect(callValidate()).rejects.toThrow("kid not found");
  });
});
