const { expect } = require("chai");
const { generateIAMPolicy } = require("../app/iamPolicyGenerator");

describe("iamPolicyGenerator tests", () => {
  let mockContext = {
    uid: "apiKey-testApiKey",
    cx_id: "testCxId",
    cx_groups: "[GRUPPO1,GRUPPO2,GRUPPO3]",
    cx_type: "PA",
  };

  it("generateIAMPolicy ok", () => {
    const policy = generateIAMPolicy(
      "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
      mockContext,
      "testApiKey"
    );
    expect(policy.usageIdentifierKey).to.equal("testApiKey");
    expect(policy.context.cx_groups).to.equal(mockContext.cx_groups);
  });

  it("generateIAMPolicy failed", () => {
    try {
      generateIAMPolicy("arn", mockContext, "testApiKey");
    } catch (error) {
      expect(error.message).to.equal("Unable to generate policy statement");
    }
  });
});
