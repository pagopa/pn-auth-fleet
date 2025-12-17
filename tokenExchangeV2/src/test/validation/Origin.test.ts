import { isOriginAllowed } from "../../app/validation/Origin";

describe("Origin Validation tests", () => {
  it("checks allowed origin", () => {
    const result = isOriginAllowed(
      "https://portale-pa-develop.fe.dev.pn.pagopa.it"
    );

    expect(result).toBeTruthy();
  });

  it("checks not allowed origin", () => {
    const result = isOriginAllowed("https://some.website.it");

    expect(result).toBeFalsy();
  });

  it("checks not allowed origin when ALLOWED_ORIGIN is not set", () => {
    process.env.ALLOWED_ORIGIN = "";
    const result = isOriginAllowed("https://some.website.it");
    expect(result).toBeFalsy();
  });
});
