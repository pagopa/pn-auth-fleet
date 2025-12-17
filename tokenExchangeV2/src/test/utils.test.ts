import { isOriginAllowed, makeLower } from "../app/utils";

describe("Utils tests", () => {
  describe("isOriginAllowed", () => {
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

  describe("makeLower", () => {
    it("makes keys of an object lowercase", () => {
      const result = makeLower({
        A: "val",
        B: "val",
        C: "val",
      });

      expect(result).not.toHaveProperty("A");
      expect(result).not.toHaveProperty("B");
      expect(result).not.toHaveProperty("C");
      expect(result).toEqual({ a: "val", b: "val", c: "val" });
    });

    it("makeLower of an empty object should be empty", () => {
      const result = makeLower({});

      expect(result).toEqual({});
    });
  });
});
