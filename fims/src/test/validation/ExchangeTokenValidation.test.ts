import { KmsJwtVerifier } from "pn-auth-common";
import { ValidationException } from "pn-auth-common-ts";
import { validateFimsToken } from "../../app/handlers/fimsExchange/validation/ExchangeTokenValidation";
import { setupEnv } from "../test.utils";

jest.mock("pn-auth-common", () => ({
  KmsJwtVerifier: { validation: jest.fn() },
}));

const validationMock = KmsJwtVerifier.validation as jest.Mock;

const validClaims = {
  uid: "cx-123",
  fiscal_code: "GRBGPP87L04L741X",
  given_name: "Giuseppe Maria",
  family_name: "Garibaldi",
  state: "fake-state",
  iss: "https://webapi.dev.notifichedigitali.it", // ISSUER from setupEnv
  iat: 1649686749,
  exp: 1649686809,
};

describe("validateFimsToken", () => {
  beforeEach(() => {
    setupEnv();
    validationMock.mockReset();
  });

  it("should verify the token with CACHE_TTL and return the decoded claims", async () => {
    validationMock.mockResolvedValue(validClaims);

    const claims = await validateFimsToken("a.b.c");

    expect(validationMock).toHaveBeenCalledWith({ jwtToken: "a.b.c", cacheTTL: 300 });
    expect(claims).toEqual(validClaims);
  });

  it("should throw ValidationException when required claims are missing", async () => {
    validationMock.mockResolvedValue({ given_name: "Giuseppe" });

    await expect(validateFimsToken("a.b.c")).rejects.toThrow(ValidationException);
  });

  it("should throw when the issuer does not match", async () => {
    validationMock.mockResolvedValue({ ...validClaims, iss: "https://evil.example.com" });

    await expect(validateFimsToken("a.b.c")).rejects.toThrow("Invalid issuer");
  });

  it("should wrap verification errors (bad signature / expired) in a ValidationException", async () => {
    validationMock.mockRejectedValue(new Error("jwt expired"));

    await expect(validateFimsToken("a.b.c")).rejects.toThrow(ValidationException);
    await expect(validateFimsToken("a.b.c")).rejects.toThrow("jwt expired");
  });
});
