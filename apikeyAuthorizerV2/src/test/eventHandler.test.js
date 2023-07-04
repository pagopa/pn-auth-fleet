const event = require("../../event.json");
const eventPdnd = require("../../event-PDND.json");
const { expect } = require("chai");
const proxyquire = require("proxyquire").noPreserveCache();
const { mockIamPolicyOk, mockIamPolicyKo } = require("./mocks");
const {
  mockPaAggregationFound,
  mockAggregateFound,
  mockIamPolicyOkPdnd,
  mockJwtValidationOk,
  mockEventTokenNull,
} = require("./mocks");

const mockBlockedVirtualKey = {
  id: "testId",
  cxId: "testCx",
  groups: ["test", "test2"],
  status: "BLOCKED",
  virtualKey: "testVk",
  pdnd: false,
};

const mockEnabledVirtualKey = {
  id: "testId",
  cxId: "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVk",
  pdnd: false,
};

const mockEnabledVirtualKeyAndPdndTrue = {
  id: "testId",
  cxId: "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVk",
  pdnd: true,
};

describe("eventHandler test ", function () {
  it("apiKeyBlocked", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockBlockedVirtualKey);
            });
          },
        },
      });

    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("iam policy ok", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockEnabledVirtualKey);
            });
          },
          getPaAggregationById: async (cx) => {
            return new Promise((res) => {
              res(mockPaAggregationFound);
            });
          },
          getPaAggregateById: async (aggregateId) => {
            return new Promise((res) => {
              res(mockAggregateFound);
            });
          },
        },
        "./iamPolicyGenerator.js": {
          generateIAMPolicy: () => {
            return mockIamPolicyOk;
          },
        },
      });

    const res = await eventHandler(event, null);
    expect(res.context.sourceChannelDetails).equals("NONINTEROP");
    expect(res.usageIdentifierKey).equal(mockIamPolicyOk.usageIdentifierKey);
    expect(res.context.cx_groups).equal(mockIamPolicyOk.context.cx_groups);
  });

  it("iam policy KO", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockEnabledVirtualKey);
            });
          },
          getPaAggregationById: async (cx) => {
            return new Promise((res) => {
              res(mockPaAggregationFound);
            });
          },
          getPaAggregateById: async (aggregateId) => {
            return new Promise((res) => {
              res(mockAggregateFound);
            });
          },
        },
        "./iamPolicyGenerator.js": {
          generateIAMPolicy: () => {
            return mockIamPolicyOk;
          },
        },
      });

    const res = await eventHandler(eventPdnd, null);
    expect(res.usageIdentifierKey).equal(mockIamPolicyKo.usageIdentifierKey);
  });

  it("iam policy ok", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockEnabledVirtualKeyAndPdndTrue);
            });
          },
          getPaAggregationById: async (cx) => {
            return new Promise((res) => {
              res(mockPaAggregationFound);
            });
          },
          getPaAggregateById: async (aggregateId) => {
            return new Promise((res) => {
              res(mockAggregateFound);
            });
          },
        },
        "./validation.js": {
          validation: () => {
            return mockJwtValidationOk;
          },
        },
        "./iamPolicyGenerator.js": {
          generateIAMPolicy: () => {
            return mockIamPolicyOkPdnd;
          },
        },
      });

    const res = await eventHandler(eventPdnd, null);
    expect(res.context.sourceChannelDetails).equals("INTEROP");
    expect(res.context.uid).equal(mockIamPolicyOkPdnd.context.uid);
  });

  it("pdnd error thrown", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockEnabledVirtualKeyAndPdndTrue);
            });
          },
          getPaAggregationById: async (cx) => {
            return new Promise((res) => {
              res(mockPaAggregationFound);
            });
          },
          getPaAggregateById: async (aggregateId) => {
            return new Promise((res) => {
              res(mockAggregateFound);
            });
          },
        },
        "./validation.js": {
          validation: () => {
            throw new Error("Pdnd error test");
          },
        },
      });

    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("pdnd error thrown", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            return new Promise((res) => {
              res(mockEnabledVirtualKeyAndPdndTrue);
            });
          },
          getPaAggregationById: async (cx) => {
            return new Promise((res) => {
              res(mockPaAggregationFound);
            });
          },
          getPaAggregateById: async (aggregateId) => {
            return new Promise((res) => {
              res(mockAggregateFound);
            });
          },
        },
        "./validation.js": {
          validation: () => {
            throw new Error("Pdnd error test");
          },
        },
      });

    const res = await eventHandler(mockEventTokenNull, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("error thrown", async () => {
    const { eventHandler } = proxyquire
      .noCallThru()
      .load("../app/eventHandler.js", {
        "./dynamoFunctions.js": {
          getApiKeyByIndex: async (vk) => {
            throw new Error("error test");
          },
        },
      });

    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });
});
