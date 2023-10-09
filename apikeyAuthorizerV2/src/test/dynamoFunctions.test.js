import { expect } from "chai";
import {
  getApiKeyByIndex,
  getPaAggregateById,
  getPaAggregationById,
} from "../app/dynamoFunctions";
import { mockPaAggregationFound, mockAggregateFound } from "./mocks";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock"; /* refers to: https://aws.amazon.com/it/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/ */

const dynamoItemVirtualApiKey = {
  id: "testId",
  "x-pagopa-pn-cx-id": "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVK",
};

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("dynamoFunctions tests", function () {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("test getPaAggregationById found", async () => {
    const params = {
      TableName: "pn-paAggregations",
      Key: { ["x-pagopa-pn-cx-id"]: "test" },
    };
    ddbMock.on(GetCommand, params).resolves({
      Item: mockPaAggregationFound,
    });
    const item = await getPaAggregationById("test");
    expect(item.aggregateId).equal("testAggregate");
  });

  it("test getPaAggregationById not found", async () => {
    const params = {
      TableName: "pn-paAggregations",
      Key: { ["x-pagopa-pn-cx-id"]: "fake" },
    };
    ddbMock.on(GetCommand, params).resolves({ Item: null });
    try {
      await getPaAggregationById(params.Key["x-pagopa-pn-cx-id"]);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(
        errorMessageDynamo("fake", "pn-paAggregations")
      );
    }
  });

  it("test getPaAggregateById found", async () => {
    const params = {
      TableName: "pn-aggregates",
      Key: { ["aggregateId"]: "test" },
    };
    ddbMock.on(GetCommand, params).resolves({
      Item: mockAggregateFound,
    });
    const item = await getPaAggregateById("test");
    expect(item.AWSApiKey).equal("testApiKey");
  });

  it("test getPaAggregateById not found", async () => {
    const params = {
      TableName: "pn-aggregates",
      Key: { ["aggregateId"]: "fake" },
    };
    ddbMock.on(GetCommand, params).resolves({ Item: null });
    try {
      await getPaAggregateById(params.Key["aggregateId"]);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal(
        errorMessageDynamo("fake", "pn-aggregates")
      );
    }
  });
});

describe("getApiKeyByIndex", function () {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("test getApiKeyByIndex found", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [dynamoItemVirtualApiKey],
    });
    const item = await getApiKeyByIndex("test");
    expect(item.virtualKey).equal("testVK");
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
});

//Casistica impossibile
describe("getApiKeyByIndex fail", function () {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("too many items", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [dynamoItemVirtualApiKey, dynamoItemVirtualApiKey],
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

function errorMessageDynamo(id, table) {
  return "Item with id = " + id + " not found on table " + table;
}
