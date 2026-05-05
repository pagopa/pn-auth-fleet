import { ValidationException } from "../../app/exception/validationException";
import { validateAar, validateIdp, validateRetrievalId } from "../../app/handlers/oidcAuthorize/validation/AuthorizeValidation";

describe("validateIdp", () => {
  it("should not throw for a valid URL", () => {
    expect(() => validateIdp("https://uat.oneid.pagopa.it")).not.toThrow();
  });

  it("should throw when idp exceeds 100 characters", () => {
    const longUrl = "https://" + "a".repeat(93) + ".it";
    expect(() => validateIdp(longUrl)).toThrow(ValidationException);
  });

  it("should throw when idp is not a valid URL", () => {
    expect(() => validateIdp("not-a-url")).toThrow(ValidationException);
  });

  it("should throw when idp is empty", () => {
    expect(() => validateIdp("")).toThrow(ValidationException);
  });
});

describe("validateAar", () => {
  const validAar = "A".repeat(106);

  it("should not throw for a valid aar", () => {
    expect(() => validateAar(validAar)).not.toThrow();
  });

  it("should not throw for an aar at max length", () => {
    expect(() => validateAar("A".repeat(136))).not.toThrow();
  });

  it("should throw when aar is too short", () => {
    expect(() => validateAar("A".repeat(105))).toThrow(ValidationException);
  });

  it("should throw when aar is too long", () => {
    expect(() => validateAar("A".repeat(137))).toThrow(ValidationException);
  });

  it("should throw when aar contains invalid characters", () => {
    expect(() => validateAar("A".repeat(105) + "!")).toThrow(ValidationException);
  });
});

describe("validateRetrievalId", () => {
  const validRetrievalId = "0e4c6629-8753-234s-b0da-1f796999ec2a";

  it("should not throw for a valid retrievalId of exactly 50 characters", () => {
    const id = "a".repeat(50);
    expect(() => validateRetrievalId(id)).not.toThrow();
  });

  it("should throw when retrievalId is shorter than 50 characters", () => {
    expect(() => validateRetrievalId(validRetrievalId.slice(0, 49))).toThrow(ValidationException);
  });

  it("should throw when retrievalId is longer than 50 characters", () => {
    expect(() => validateRetrievalId("a".repeat(51))).toThrow(ValidationException);
  });

  it("should throw when retrievalId contains non-printable characters", () => {
    expect(() => validateRetrievalId("a".repeat(49) + "\x01")).toThrow(ValidationException);
  });
});
