const { expect } = require("chai");

const { parseMethodArn, isLogoutRequest } = require("../app/methodArn");

describe("test methodArn", () => {
  const logoutMethodArn = "arn:aws:execute-api:eu-south-1:123456789012:logout123/unique/POST/";

  describe("parseMethodArn", () => {
    it("should extract region, account, rest api and stage", () => {
      expect(parseMethodArn(logoutMethodArn)).to.deep.equal({
        region: "eu-south-1",
        awsAccountId: "123456789012",
        restApiId: "logout123",
        stage: "unique",
      });
    });
  });

  describe("isLogoutRequest", () => {
    beforeEach(() => {
      process.env.WEB_LOGOUT_REST_API_ID = "logout123";
    });

    afterEach(() => {
      delete process.env.WEB_LOGOUT_REST_API_ID;
    });

    it("should return true for the logout rest api", () => {
      expect(isLogoutRequest(logoutMethodArn)).to.be.true;
    });

    it("should return false for other rest apis", () => {
      expect(
        isLogoutRequest("arn:aws:execute-api:eu-south-1:123456789012:bff456/unique/POST/v1/mandate")
      ).to.be.false;
    });

    it("should return false when WEB_LOGOUT_REST_API_ID is not set", () => {
      delete process.env.WEB_LOGOUT_REST_API_ID;

      expect(isLogoutRequest(logoutMethodArn)).to.be.false;
    });
  });
});
