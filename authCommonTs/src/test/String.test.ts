import { makeLower, removeFiscalNumberPrefix, isValidUUID } from "../String";

describe("String utils Tests", () => {
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

  describe("removeFiscalNumberPrefix", () => {
    it("should remove the fiscal number international prefix if present", () => {
      expect(removeFiscalNumberPrefix("TINIT-12345678901")).toBe("12345678901");
    });

    it("should return the fiscal number unchanged if no prefix is present", () => {
      expect(removeFiscalNumberPrefix("12345678901")).toBe("12345678901");
    });
  });

  describe("isValidUUID", () => {
    it("should accept a valid UUID v4", () => {
      expect(isValidUUID("9f1a8b3c-4d5e-4f6a-8b9c-0d1e2f3a4b5c")).toBe(true);
    });

    it("should reject a non-UUID string", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
    });
  });
});
