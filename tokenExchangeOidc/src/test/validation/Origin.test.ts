import { isOriginAllowed } from "../../app/validation/Origin";
import { setupEnv } from "../test.utils";

describe("Origin Validation tests", () => {
  beforeEach(() => {
    setupEnv();
  });

  it("checks allowed origin", () => {
    const result = isOriginAllowed(
      "https://cittadini.dev.notifichedigitali.it"
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
