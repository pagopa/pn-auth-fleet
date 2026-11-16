const { expect } = require("chai");

const { parseMethodArn, isLogoutRequest, isZendeskRequest } = require("../app/methodArn");

describe("test methodArn", () => {
  const logoutMethodArn = "arn:aws:execute-api:eu-south-1:123456789012:logout123/unique/POST/";
  const zendeskMethodArn =
    "arn:aws:execute-api:eu-south-1:123456789012:zendesk789/unique/POST/new-support-request";

  describe("parseMethodArn", () => {
    it("should extract region, account, rest api, stage, method and resource path", () => {
      expect(parseMethodArn(logoutMethodArn)).to.deep.equal({
        region: "eu-south-1",
        awsAccountId: "123456789012",
        restApiId: "logout123",
        stage: "unique",
        method: "POST",
        resourcePath: "",
      });
    });

    it("should keep the nested resource path", () => {
      const { method, resourcePath } = parseMethodArn(
        "arn:aws:execute-api:eu-south-1:123456789012:bff456/unique/GET/v1/notifications/received/IUN-123"
      );

      expect(method).to.equal("GET");
      expect(resourcePath).to.equal("v1/notifications/received/IUN-123");
    });
  });

  describe("isZendeskRequest", () => {
    it("should return true for POST /new-support-request", () => {
      expect(isZendeskRequest(zendeskMethodArn)).to.be.true;
    });

    it("should return false for a different method on the same path", () => {
      expect(
        isZendeskRequest("arn:aws:execute-api:eu-south-1:123456789012:zendesk789/unique/GET/new-support-request")
      ).to.be.false;
    });

    it("should return false for a longer path ending with the same segments", () => {
      expect(
        isZendeskRequest(
          "arn:aws:execute-api:eu-south-1:123456789012:bff456/unique/GET/v1/foo/POST/new-support-request"
        )
      ).to.be.false;
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
