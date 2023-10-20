const { expect, assert } = require("chai");
const { generateIAMPolicy } = require("../app/iamPolicyGenerator");
const { ValidationException } = require("../app/exceptions");

describe("iamPolicyGenerator tests", () => {
  const mockContext = {
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
    assert.throws(
      () => {
        generateIAMPolicy("arn", mockContext, "testApiKey");
      },
      ValidationException,
      "Unable to generate policy statement"
    );
  });
});
