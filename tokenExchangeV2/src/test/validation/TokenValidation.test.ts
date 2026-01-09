import { decode, verify } from "jsonwebtoken";
import { ValidationException } from "../../app/exception/validationException";
import { getAWSParameterStore } from "../../app/utils/AwsParameters";
import { getPublicKey } from "../../app/utils/PublicKey";
import {
  isAudienceValid,
  isIssuerValid,
  isTaxIdValid,
  validateOneIdentityIdToken,
} from "../../app/validation/TokenValidation";
import {
  oneIdentityDecodedTokenMock,
  tokenNonce,
} from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";

jest.mock("jsonwebtoken");
jest.mock("../../app/utils/AwsParameters.ts");
jest.mock("../../app/utils/PublicKey.ts");

const mockDecode = decode as jest.MockedFunction<typeof decode>;
const mockVerify = verify as jest.MockedFunction<typeof verify>;
const mockGetAWSParameterStore = getAWSParameterStore as jest.MockedFunction<
  typeof getAWSParameterStore
>;
const mockGetPublicKey = getPublicKey as jest.MockedFunction<
  typeof getPublicKey
>;

describe("validateOneIdentityIdToken", () => {
  const validToken = "valid-jwt-token";

  beforeEach(() => {
    jest.clearAllMocks();
    setupEnv();

    mockGetPublicKey.mockResolvedValue("mock-public-key");
    mockVerify.mockReturnValue({} as any);
  });

  it("should throw ValidationException when token is null", async () => {
    mockDecode.mockReturnValue(null);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Token is not valid"));
  });

  it("should throw ValidationException for invalid algorithm", async () => {
    mockDecode.mockReturnValue({
      ...oneIdentityDecodedTokenMock,
      header: { ...oneIdentityDecodedTokenMock.header, alg: "HS256" },
    } as any);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Invalid algorithm"));
  });

  it("should throw ValidationException for invalid audience", async () => {
    mockDecode.mockReturnValue({
      ...oneIdentityDecodedTokenMock,
      payload: {
        ...oneIdentityDecodedTokenMock.payload,
        aud: "invalid-audience",
      },
    } as any);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Invalid Audience"));
  });

  it("should throw ValidationException for invalid issuer", async () => {
    mockDecode.mockReturnValue({
      ...oneIdentityDecodedTokenMock,
      payload: {
        ...oneIdentityDecodedTokenMock.payload,
        iss: "invalid-issuer",
      },
    } as any);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Issuer not known"));
  });

  it("should throw ValidationException for blocked tax ID", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("some-other-taxid");
    mockDecode.mockReturnValue(oneIdentityDecodedTokenMock as any);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("TaxId not allowed"));
  });

  it("should throw ValidationException for invalid nonce", async () => {
    mockDecode.mockReturnValue({
      ...oneIdentityDecodedTokenMock,
      payload: {
        ...oneIdentityDecodedTokenMock.payload,
        nonce: "invalid-nonce",
      },
    } as any);

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Invalid nonce"));
  });

  it("should successfully validate token with wildcard tax ID", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("*");
    mockDecode.mockReturnValue(oneIdentityDecodedTokenMock as any);

    const result = await validateOneIdentityIdToken(validToken, tokenNonce);

    expect(result).toEqual(oneIdentityDecodedTokenMock.payload);
    expect(mockVerify).toHaveBeenCalledWith(validToken, "mock-public-key");
  });

  it("should throw ValidationException when JWT verification fails", async () => {
    mockDecode.mockReturnValue(oneIdentityDecodedTokenMock as any);
    mockGetPublicKey.mockResolvedValue("mock-public-key");
    mockVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Invalid signature"));
  });

  it("should handle non Error exceptions during JWT verification", async () => {
    mockDecode.mockReturnValue(oneIdentityDecodedTokenMock as any);
    mockGetPublicKey.mockResolvedValue("mock-public-key");
    mockVerify.mockImplementation(() => {
      throw "String error";
    });

    await expect(
      validateOneIdentityIdToken(validToken, tokenNonce)
    ).rejects.toThrow(new ValidationException("Unknown error"));
  });

  it("should return true when parameter store returns empty string", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("");
    mockDecode.mockReturnValue(oneIdentityDecodedTokenMock as any);

    const result = await validateOneIdentityIdToken(validToken, tokenNonce);
    expect(result).toEqual(oneIdentityDecodedTokenMock.payload);
  });
});

describe("isIssuerValid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEnv();
  });

  it("should return true for allowed issuer", () => {
    const issuer = "https://spid-hub-test.dev.pn.pagopa.it";

    expect(isIssuerValid(issuer)).toBe(true);
  });

  it("should return false for disallowed issuer", () => {
    const issuer = "https://disallowed-issuer.com";

    expect(isIssuerValid(issuer)).toBe(false);
  });

  it("should return false if ALLOWED_ISSUER env var is not set", () => {
    delete process.env.ALLOWED_ISSUER;
    const issuer = "https://spid-hub-test.dev.pn.pagopa.it";

    expect(isIssuerValid(issuer)).toBe(false);
  });
});

describe("isAudienceValid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEnv();
  });

  it("should return true for allowed audience", () => {
    const audience = "portale-pf-develop.fe.dev.pn.pagopa.it";
    expect(isAudienceValid(audience)).toBe(true);
  });

  it("should return false for disallowed audience", () => {
    const audience = "disallowed-audience";
    expect(isAudienceValid(audience)).toBe(false);
  });

  it("should return false if ACCEPTED_AUDIENCE env var is not set", () => {
    delete process.env.ACCEPTED_AUDIENCE;
    const audience = "portale-pf-develop.fe.dev.pn.pagopa.it";
    expect(isAudienceValid(audience)).toBe(false);
  });
});

describe("isTaxIdValid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEnv();
  });

  it("should return true when no ALLOWED_TAXIDS_PARAMETER is set", async () => {
    delete process.env.ALLOWED_TAXIDS_PARAMETER;

    const result = await isTaxIdValid("any-tax-id");
    expect(result).toBe(true);
  });

  it("should return true when ALLOWED_TAXIDS_PARAMETER is set to *", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("*");

    const result = await isTaxIdValid("any-tax-id");
    expect(result).toBe(true);
  });

  it("should return true for allowed tax ID", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("tax-id-1,tax-id-2,any-tax-id");

    const result = await isTaxIdValid("any-tax-id");
    expect(result).toBe(true);
  });

  it("should return false for disallowed tax ID", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("tax-id-1,tax-id-2");

    const result = await isTaxIdValid("dissalowed-tax-id");
    expect(result).toBe(false);
  });

  it("should return false for explicitly blocked tax ID", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue(
      "tax-id-1,tax-id-2,!blocked-tax-id"
    );

    const result = await isTaxIdValid("blocked-tax-id");
    expect(result).toBe(false);
  });

  it("should handle blocked tax ID with wildcard present", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("*,!blocked-tax-id");

    const result = await isTaxIdValid("blocked-tax-id");
    expect(result).toBe(false);
  });

  it("should allow tax ID when wildcard is present despite explicit block check order", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("*,!blocked-tax-id");

    const result = await isTaxIdValid("ALLOWEDTAXID");
    expect(result).toBe(true);
  });

  it("should return true when parameter store returns empty string", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("");

    const result = await isTaxIdValid("any-tax-id");
    expect(result).toBe(true);
  });

  it("should return false when parameter store retrieval fails", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockRejectedValue(new Error("AWS error"));

    const result = await isTaxIdValid("any-tax-id");
    expect(result).toBe(false);
  });

  it("should return false when taxIdCode is undefined and not in wildcard mode", async () => {
    process.env.ALLOWED_TAXIDS_PARAMETER = "allowed-taxids";
    mockGetAWSParameterStore.mockResolvedValue("tax-id-1,tax-id-2");

    const result = await isTaxIdValid(undefined);
    expect(result).toBe(false);
  });
});
