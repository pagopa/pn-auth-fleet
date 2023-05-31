const AWS = require("aws-sdk");
const { expect } = require("chai");
const AWSMock = require("aws-sdk-mock");
const {
  getApiKeyByIndex,
  getPaAggregateById,
  getPaAggregationById,
} = require("../app/dynamoFunctions");
const { mockPaAggregationFound, mockAggregateFound } = require("./mocks");

const dynamoItemVirtualApiKey = {
  id: "testId",
  "x-pagopa-pn-cx-id": "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVK",
};

describe("dynamoFunctions tests", function () {
  this.afterAll(() => {
    AWSMock.restore("DynamoDB.DocumentClient");
  });

  this.beforeAll(() => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock("DynamoDB.DocumentClient", "get", (params, callback) => {
      let dynamoItem;
      switch (params.TableName) {
        case "pn-paAggregations":
          dynamoItem =
            params.Key["x-pagopa-pn-cx-id"] === "fake"
              ? undefined
              : mockPaAggregationFound;
          break;
        case "pn-aggregates":
          dynamoItem =
            params.Key.aggregateId === "fake" ? undefined : mockAggregateFound;
          break;
      }
      callback(null, { Item: dynamoItem });
    });
  });

  it("test getPaAggregationById found", async () => {
    const item = await getPaAggregationById("test");
    expect(item.aggregateId).equal("testAggregate");
  });

  it("test getPaAggregationById not found", async () => {
    let id = "fake";
    let table = "pn-paAggregations";
    try {
      await getPaAggregationById(id);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(errorMessageDynamo(id, table));
    }
  });

  it("test getPaAggregateById found", async () => {
    const item = await getPaAggregateById("test");
    expect(item.AWSApiKey).equal("testApiKey");
  });

  it("test getPaAggregateById not found", async () => {
    let id = "fake";
    let table = "pn-aggregates";
    try {
      await getPaAggregateById(id);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(errorMessageDynamo(id, table));
    }
  });
});

describe("getApiKeyByIndex", function () {
  it("test getApiKeyByIndex found", async () => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock("DynamoDB.DocumentClient", "query", (params, callback) => {
      callback(null, { Items: [dynamoItemVirtualApiKey] });
    });
    const item = await getApiKeyByIndex("test");
    AWSMock.restore("DynamoDB.DocumentClient");
    expect(item.virtualKey).equal("testVK");
  });

  it("test getApiKeyByIndex not found", async () => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock("DynamoDB.DocumentClient", "query", (params, callback) => {
      callback(null, { Items: [] });
    });
    let id = "fakekey";
    let table = "pn-apiKey";
    let anonymizedId = "fa***ey";
    try {
      await getApiKeyByIndex(id);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(errorMessageDynamo(anonymizedId, table));
    }
    AWSMock.restore("DynamoDB.DocumentClient");
  });
});

//Casistica impossibile
describe("getApiKeyByIndex fail", function () {
  this.afterAll(() => {
    AWSMock.restore("DynamoDB.DocumentClient");
  });

  this.beforeAll(() => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock("DynamoDB.DocumentClient", "query", (params, callback) => {
      let dynamoItem = [dynamoItemVirtualApiKey, dynamoItemVirtualApiKey];
      callback(null, { Items: dynamoItem });
    });
  });

  it("too many items", async () => {
    try {
      await getApiKeyByIndex("test");
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Too many items found on table pn-apiKey");
    }
  });
});

function errorMessageDynamo(id, table) {
  return "Item with id = " + id + " not found on table " + table;
}
