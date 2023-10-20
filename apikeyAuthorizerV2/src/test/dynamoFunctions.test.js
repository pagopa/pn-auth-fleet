const { expect } = require("chai");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  mockClient,
} = require("aws-sdk-client-mock"); /* refers to: https://aws.amazon.com/it/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/ */

const {
  getApiKeyByIndex,
  getPaAggregateById,
  getPaAggregationById,
} = require("../app/dynamoFunctions.js");
const {
  mockPaAggregationFound,
  mockAggregateFound,
  mockVirtualKey,
} = require("./mocks.js");

function errorMessageDynamo(id, table) {
  return "Item with id = " + id + " not found on table " + table;
}

describe("dynamoFunctions tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
  });

  it("test getPaAggregationById found", async () => {
    const id = "test";
    const params = {
      TableName: "pn-paAggregations",
      Key: { ["x-pagopa-pn-cx-id"]: id },
    };
    ddbMock.on(GetCommand, params).resolves({
      Item: mockPaAggregationFound,
    });
    const item = await getPaAggregationById(id);
    expect(item.aggregateId).equal(mockPaAggregationFound.aggregateId);
  });

  it("test getPaAggregationById not found", async () => {
    const id = "fake";
    const params = {
      TableName: "pn-paAggregations",
      Key: { ["x-pagopa-pn-cx-id"]: id },
    };
    ddbMock.on(GetCommand, params).resolves({ Item: null });
    try {
      await getPaAggregationById(params.Key["x-pagopa-pn-cx-id"]);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(errorMessageDynamo(id, params.TableName));
    }
  });

  it("test getPaAggregateById found", async () => {
    const id = "test";
    const params = {
      TableName: "pn-aggregates",
      Key: { ["aggregateId"]: id },
    };
    ddbMock.on(GetCommand, params).resolves({
      Item: mockAggregateFound,
    });
    const item = await getPaAggregateById(id);
    expect(item.AWSApiKey).equal(mockAggregateFound.AWSApiKey);
  });

  it("test getPaAggregateById not found", async () => {
    const id = "fake";
    const params = {
      TableName: "pn-aggregates",
      Key: { ["aggregateId"]: id },
    };
    ddbMock.on(GetCommand, params).resolves({ Item: null });
    try {
      await getPaAggregateById(params.Key["aggregateId"]);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(errorMessageDynamo(id, params.TableName));
    }
  });

  it("test getApiKeyByIndex found", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [mockVirtualKey],
    });
    const item = await getApiKeyByIndex("test");
    expect(item.virtualKey).equal(mockVirtualKey.virtualKey);
  });

  it("test getApiKeyByIndex not found", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: null });
    try {
      await getApiKeyByIndex("fakekey");
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(
        errorMessageDynamo("fa***ey", "pn-apiKey")
      );
    }
  });

  //Casistica impossibile
  it("test getApiKeyByIndex too many items", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [mockVirtualKey, mockVirtualKey],
    });
    try {
      await getApiKeyByIndex("test");
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Too many items found on table pn-apiKey");
    }
  });
});
