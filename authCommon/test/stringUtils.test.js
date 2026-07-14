const { expect } = require("chai");

const { maskString } = require("../app/modules/utils/stringUtils");

describe("stringUtils tests", function () {
  describe("maskString", () => {
    it("should fully mask strings shorter than 6 characters", () => {
      expect(maskString("abc")).to.equal("***");
      expect(maskString("12345")).to.equal("*****");
      expect(maskString("a")).to.equal("*");
    });

    it("should mask middle characters for strings 6 or more characters long", () => {
      expect(maskString("123456")).to.equal("12**56");
      expect(maskString("john.doe@example.com")).to.equal("jo****************om");
      expect(maskString("ABCDEFGHIJ")).to.equal("AB******IJ");
    });
  });
});
