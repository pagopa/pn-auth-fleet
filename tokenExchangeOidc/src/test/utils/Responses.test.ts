import { ValidationException } from "../../app/exception/validationException";
import { generateKoResponse } from "../../app/utils/Responses";
import { allowedOrigin, makeKoResponse } from "../__mock__/responses.mock";
import { setupEnv } from "../test.utils";

describe("Responses Tests", () => {
  beforeAll(() => {
    setupEnv();
  });

  it("generateKoResponse - Generic string error", () => {
    const result = generateKoResponse("Some server error", allowedOrigin);

    expect(result).toEqual(makeKoResponse("Some server error", 500));
  });

  it("generateKoResponse - Generic error", () => {
    const result = generateKoResponse(
      new Error("Generic Error"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("Generic Error", 500));
  });

  it("generateKoResponse - Role not allowed", () => {
    const result = generateKoResponse(
      new ValidationException("Role not allowed"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("Role not allowed", 403));
  });

  it("generateKoResponse - TaxId not allowed", () => {
    const result = generateKoResponse(
      new ValidationException("TaxId not allowed"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("TaxId not allowed", 451));
  });

  it("generateKoResponse - Issuer not known", () => {
    const result = generateKoResponse(
      new ValidationException("Issuer not known"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("Issuer not known", 400));
  });

  it("generateKoResponse - Invalid Audience", () => {
    const result = generateKoResponse(
      new ValidationException("Invalid Audience"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("Invalid Audience", 400));
  });

  it("generateKoResponse - Token is not valid", () => {
    const result = generateKoResponse(
      new ValidationException("Token is not valid"),
      allowedOrigin
    );

    expect(result).toEqual(makeKoResponse("Token is not valid", 400));
  });
});
