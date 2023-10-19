const { expect } = require("chai");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { mockClient } = require("aws-sdk-client-mock");
const sinon = require("sinon");
const jsonwebtoken = require("jsonwebtoken");
const AWSXRay = require("aws-xray-sdk-core");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const fs = require("fs");

const { eventHandler } = require("../app/eventHandler");
const event = require("../../event.json");
const eventPdnd = require("../../event-PDND.json");
const {
  mockPaAggregationFound,
  mockAggregateFound,
  mockEventTokenNull,
  mockVirtualKey,
  mockDecodedJwt,
} = require("./mocks.js");

describe("eventHandler test ", function () {
  let ddbMock;
  let mock;
  const jwksFromPdnd = JSON.parse(
    fs.readFileSync("./src/test/jwks-mock/interop-pagopa-jwks.json", {
      encoding: "utf8",
    })
  );

  before(() => {
    AWSXRay.setContextMissingStrategy("IGNORE_ERROR");
    mock = new MockAdapter(axios);
    mock
      .onGet("https://uat.interop.pagopa.it/.well-known/jwks.json")
      .reply(200, jwksFromPdnd);
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
    mock.restore();
  });

  it("apiKeyBlocked", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ ...mockVirtualKey, status: "BLOCKED" }],
    });
    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("iam policy ok", async () => {
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
    const res = await eventHandler(event, null);
    expect(res.context.sourceChannelDetails).equals("NONINTEROP");
    expect(res.usageIdentifierKey).equal(mockAggregateFound.AWSApiKey);
    expect(res.context.cx_groups).equal(mockVirtualKey.groups.join());
  });

  it("iam policy KO - pdnd", async () => {
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
    const res = await eventHandler(eventPdnd, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("iam policy ok - pdnd", async () => {
    sinon.stub(jsonwebtoken, "verify").returns("token.token.token");
    ddbMock
      .on(QueryCommand)
      .resolves({
        Items: [{ ...mockVirtualKey, pdnd: true }],
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
    const res = await eventHandler(eventPdnd, null);
    expect(res.context.sourceChannelDetails).equals("INTEROP");
    expect(res.context.uid).equal("PDND-" + mockDecodedJwt.client_id);
  });

  it("pdnd error thrown", async () => {
    sinon.stub(jsonwebtoken, "verify").throws();
    ddbMock
      .on(QueryCommand)
      .resolves({
        Items: [{ ...mockVirtualKey, pdnd: true }],
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
    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("pdnd error thrown token null", async () => {
    sinon.stub(jsonwebtoken, "verify").throws();
    ddbMock
      .on(QueryCommand)
      .resolves({
        Items: [{ ...mockVirtualKey, pdnd: true }],
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
    const res = await eventHandler(mockEventTokenNull, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });

  it("error thrown", async () => {
    ddbMock.on(QueryCommand).rejects();
    const res = await eventHandler(event, null);
    expect(res.policyDocument.Statement[0].Effect).equal("Deny");
    expect(res.usageIdentifierKey).to.be.undefined;
  });
});
