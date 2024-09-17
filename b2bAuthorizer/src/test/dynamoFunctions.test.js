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
  getApiKeyByIndex
} = require("../app/modules/middleware/dynamoFunctions.js");
const {
  mockVirtualKey
} = require("./mocks.js");

function errorMessageDynamo(table) {
  return "VirtualKey not found on table " + table;
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
        errorMessageDynamo("pn-apiKey")
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
