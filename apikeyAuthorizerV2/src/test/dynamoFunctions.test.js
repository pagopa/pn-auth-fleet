import { expect } from "chai";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock"; /* refers to: https://aws.amazon.com/it/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/ */

import {
  getApiKeyByIndex,
  getPaAggregateById,
  getPaAggregationById,
} from "../app/dynamoFunctions.js";
import { mockPaAggregationFound, mockAggregateFound } from "./mocks.js";

const dynamoItemVirtualApiKey = {
  id: "testId",
  "x-pagopa-pn-cx-id": "testCx",
  groups: ["test", "test2"],
  status: "ENABLED",
  virtualKey: "testVK",
};

describe("dynamoFunctions tests", function () {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
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
});

describe("getApiKeyByIndex", function () {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
  });

  it("test getApiKeyByIndex found", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [dynamoItemVirtualApiKey],
    });
    const item = await getApiKeyByIndex("test");
    expect(item.virtualKey).equal(dynamoItemVirtualApiKey.virtualKey);
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
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
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
