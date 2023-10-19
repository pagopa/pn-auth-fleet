const { expect } = require("chai");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { mockClient } = require("aws-sdk-client-mock");
const sinon = require("sinon");
const AWSXRay = require("aws-xray-sdk-core");

const lambda = require("../../index");
const event = require("../../event.json");
const {
  mockVirtualKey,
  mockPaAggregationFound,
  mockAggregateFound,
} = require("./mocks");

describe("index tests", function () {
  let ddbMock;

  before(() => {
    AWSXRay.setContextMissingStrategy("IGNORE_ERROR");
  });

  beforeEach(() => {
    sinon.stub(process, "env").value({
      PDND_ISSUER: "uat.interop.pagopa.it",
      PDND_AUDIENCE: "https://api.dev.pn.pagopa.it",
    });
    ddbMock = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    ddbMock.reset();
    sinon.restore();
  });

  after(() => {
    ddbMock.restore();
    AWSXRay.setContextMissingStrategy("RUNTIME_ERROR");
  });

  it("test Ok", async () => {
    ddbMock
      .on(QueryCommand)
      .resolves({
        Items: [mockVirtualKey],
      })
      .on(GetCommand, {
        TableName: "pn-paAggregations",
        Key: {
          ["x-pagopa-pn-cx-id"]: mockVirtualKey["x-pagopa-pn-cx-id"],
        },
      })
      .resolves({
        Item: mockPaAggregationFound,
      })
      .on(GetCommand, {
        TableName: "pn-aggregates",
        Key: { ["aggregateId"]: mockPaAggregationFound.aggregateId },
      })
      .resolves({
        Item: mockAggregateFound,
      });
    const res = await lambda.handler(event, null);
    expect(res.usageIdentifierKey).equal(mockAggregateFound.AWSApiKey);
    expect(res.context.cx_groups).equal(mockVirtualKey.groups.join());
  });

  it("test fail", async () => {
    ddbMock.on(QueryCommand).rejects();
    const res = await lambda.handler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
  });
});
