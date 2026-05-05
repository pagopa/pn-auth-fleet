const { expect } = require("chai");

const { buildSupportPolicy, buildLogoutPolicy } = require("../policies");

const defaultParams = {
  region: "eu-south-1",
  awsAccountId: "123456789012",
  restApiId: "abc123def",
  stage: "prod",
  contextAttrs: { uid: "user-1", cx_type: "BS", cx_role: "admin" },
};

describe("test policies", () => {
  describe("buildSupportPolicy", () => {
    it("should replace all placeholders in resources", () => {
      const result = buildSupportPolicy(defaultParams);

      for (const resource of result.policyDocument.Statement[0].Resource) {
        expect(resource).to.include("eu-south-1");
        expect(resource).to.include("123456789012");
        expect(resource).to.include("abc123def");
        expect(resource).to.include("/prod/");
        expect(resource).to.not.include("{region}");
        expect(resource).to.not.include("{awsAccountId}");
        expect(resource).to.not.include("{restApiId}");
        expect(resource).to.not.include("{stage}");
      }
    });

    it("should set context attributes", () => {
      const result = buildSupportPolicy(defaultParams);

      expect(result.context).to.deep.equal(defaultParams.contextAttrs);
    });

    it("should return resources as array", () => {
      const result = buildSupportPolicy(defaultParams);

      expect(result.policyDocument.Statement[0].Resource).to.be.an("array");
    });

    it("should not mutate the original template", () => {
      const result1 = buildSupportPolicy(defaultParams);
      const result2 = buildSupportPolicy({
        ...defaultParams,
        region: "us-east-1",
        contextAttrs: { uid: "other" },
      });

      expect(result1.policyDocument.Statement[0].Resource[0]).to.include("eu-south-1");
      expect(result2.policyDocument.Statement[0].Resource[0]).to.include("us-east-1");
      expect(result1.context).to.not.deep.equal(result2.context);
    });
  });

  describe("buildLogoutPolicy", () => {
    it("should replace all placeholders", () => {
      const result = buildLogoutPolicy(defaultParams);

      expect(result.policyDocument.Statement[0].Resource).to.equal(
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/POST/",
      );
    });

    it("should preserve Resource as string when template has string", () => {
      const result = buildLogoutPolicy(defaultParams);

      expect(result.policyDocument.Statement[0].Resource).to.be.a("string");
    });

    it("should set context attributes", () => {
      const result = buildLogoutPolicy(defaultParams);

      expect(result.context).to.deep.equal(defaultParams.contextAttrs);
    });
  });
});
