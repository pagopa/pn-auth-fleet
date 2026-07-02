import { ValidationException, verifyKmsJwt } from "pn-auth-common-ts";
import { validateFimsToken } from "../../app/handlers/fimsExchange/validation/ExchangeTokenValidation";
import { setupEnv } from "../test.utils";

jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  verifyKmsJwt: jest.fn(),
}));

const verifyKmsJwtMock = verifyKmsJwt as jest.Mock;

const validClaims = {
  uid: "cx-123",
  fiscal_code: "GRBGPP87L04L741X",
  given_name: "Giuseppe Maria",
  family_name: "Garibaldi",
  state: "fake-state",
  iat: 1649686749,
  exp: 1649686809,
};

describe("validateFimsToken", () => {
  beforeEach(() => {
    setupEnv();
    verifyKmsJwtMock.mockReset();
  });

  it("should verify the token with CACHE_TTL and return the decoded claims", async () => {
    verifyKmsJwtMock.mockResolvedValue(validClaims);

    const claims = await validateFimsToken("a.b.c");

    expect(verifyKmsJwtMock).toHaveBeenCalledWith({ jwt: "a.b.c", cacheTTL: 300 });
    expect(claims).toEqual(validClaims);
  });

  it("should throw ValidationException when required claims are missing", async () => {
    verifyKmsJwtMock.mockResolvedValue({ given_name: "Giuseppe" });

    await expect(validateFimsToken("a.b.c")).rejects.toThrow(ValidationException);
  });

  it("should propagate verification errors (bad signature / expired)", async () => {
    verifyKmsJwtMock.mockRejectedValue(new ValidationException("invalid"));

    await expect(validateFimsToken("a.b.c")).rejects.toThrow(ValidationException);
  });
});
