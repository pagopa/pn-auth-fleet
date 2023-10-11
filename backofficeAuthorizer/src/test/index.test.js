const { expect } = require("chai");
import event from "../../event.json";
const { proxyquire } = require("proxyquire");
import { mockIamPolicyOk, mockIamPolicyKo } from "./mocks";

describe("index tests", function () {
  it("test Ok", async () => {
    const lambda = proxyquire
      .noPreserveCache()
      .noCallThru()
      .load("../../index.js", {
        "./src/app/eventHandler.js": {
          handleEvent: async () => {
            return new Promise((res) => res(mockIamPolicyOk));
          },
        },
      });

    const res = await lambda.handler(event, null);
    expect(res.usageIdentifierKey).equal("testApiKey");
  });

  it("test fail", async () => {
    const lambda = proxyquire
      .noPreserveCache()
      .noCallThru()
      .load("../../index.js", {
        "./src/app/eventHandler.js": {
          handleEvent: async () => {
            return new Promise((res) => res(mockIamPolicyKo));
          },
        },
      });
    const res = await lambda.handler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
  });
});
