const event = require('../../event.json');
const { expect } = require('chai');
const proxyquire = require('proxyquire').noPreserveCache();
const { mockIamPolicyOk } = require("./mocks");
const { mockPaAggregationFound, mockAggregateFound } = require("./mocks");

const mockBlockedVirtualKey = {
  cxId : "testCx",
  groups: ["test", "test2"],
  status: "BLOCKED",
  virtualKey: "testVk"
};

const mockEnabledVirtualKey = {
  cxId : "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVk"
}

describe('eventHandler test ', function() {

  it("apiKeyBlocked", async () => {
    const { eventHandler } = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./dynamoFunctions.js": {
        getApiKeyByIndex: async (vk) => {
          return new Promise(res => {
            res(mockBlockedVirtualKey)
          })
        }
      }
    });
  
    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal('Deny');
    expect(res.usageIdentifierKey).to.be.undefined;
  })

  it("iam policy ok", async () => {
    const { eventHandler } = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./dynamoFunctions.js": {
        getApiKeyByIndex: async (vk) => {
          return new Promise(res => {
            res(mockEnabledVirtualKey)
          })
        },
        getPaAggregationById: async (cx) => {
          return new Promise(res => {
            res(mockPaAggregationFound)
          })
        },
        getPaAggregateById: async (aggregateId) => {
          return new Promise(res => {
            res(mockAggregateFound)
          })
        } 
      },
      "./iamPolicyGenerator.js": {
        generateIAMPolicy: ()=> {
          return mockIamPolicyOk;
        }
      }
    });
  
    const res = await eventHandler(event, null);
    expect(res.usageIdentifierKey).equal('testApiKey');
  })
});

