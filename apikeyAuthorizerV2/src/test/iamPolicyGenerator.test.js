const { expect } = require("chai");
const { generateIAMPolicy } = require('../app/iamPolicyGenerator');

describe("iamPolicyGenerator tests", () => {
    let mockContext = {
        "x-pagopa-pn-uid": "apiKey-testApiKey",
        "x-pagopa-pn-cx-id": "testCxId",
        "x-pagopa-pn-cx-groups": "[GRUPPO1,GRUPPO2]",
        "x-pagopa-pn-cxtype": "PA"
    }

    it("generateIAMPolicy ok", () => {
        const policy = generateIAMPolicy("arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request", mockContext, "testApiKey");
        expect(policy.usageIdentifierKey).to.equal("testApiKey")
    })

    it("generateIAMPolicy failed", () => {
        try {
            generateIAMPolicy("arn", mockContext, "testApiKey");
        } catch (error) {
            expect(error.message).to.equal("Unable to generate policy statement");
        }
    })
})