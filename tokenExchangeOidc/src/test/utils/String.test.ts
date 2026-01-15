import {
  makeLower,
  maskString,
  retrieveEnvVariable,
} from "../../app/utils/String";
import { setupEnv } from "../test.utils";

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

  describe("maskString", () => {
    it("should fully mask strings shorter than 6 characters", () => {
      expect(maskString("abc")).toBe("***");
      expect(maskString("12345")).toBe("*****");
      expect(maskString("a")).toBe("*");
    });

    it("should mask middle characters for strings 6 or more characters long", () => {
      expect(maskString("123456")).toBe("12**56");
      expect(maskString("john.doe@example.com")).toBe("jo****************om");
      expect(maskString("ABCDEFGHIJ")).toBe("AB******IJ");
    });
  });

  describe("retrieveEnvVariable", () => {
    beforeEach(() => {
      jest.resetModules();
      setupEnv();
    });

    it("should return environment variable value when it exists", () => {
      process.env.TEST_VAR = "test_value";

      const result = retrieveEnvVariable("TEST_VAR");

      expect(result).toBe("test_value");
    });

    it("should throw error when environment variable is not set", () => {
      delete process.env.TEST_VAR;

      expect(() => retrieveEnvVariable("TEST_VAR")).toThrow(
        new Error("TEST_VAR is not set")
      );
    });
  });
});
