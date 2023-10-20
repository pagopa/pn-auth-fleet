const { mockClient } = require("aws-sdk-client-mock");
const {
  APIGatewayClient,
  GetTagsCommand,
} = require("@aws-sdk/client-api-gateway");
const { expect } = require("chai");

const { getOpenAPIS3Location } = require("../app/apiGatewayUtils");

describe("api gateway tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(APIGatewayClient);
  });

  after(() => {
    ddbMock.restore();
  });

  it("test tags extraction", async () => {
    ddbMock.on(GetTagsCommand).resolves({
      tags: {
        PN_OPENAPI_BUCKET_NAME: "1231",
        PN_OPENAPI_BUCKET_KEY: "abcd",
        PN_SERVICE_PATH: "api-key-bo",
      },
    });

    const tags = await getOpenAPIS3Location({
      region: "eu-south-1",
      restApiId: "12312312",
    });

    expect(tags).deep.equal(["1231", "abcd", "api-key-bo"]);
  });

  it("test tags extraction", async () => {
    ddbMock.on(GetTagsCommand).resolves({
      tags: {
        PN_OPENAPI_BUCKET_KEY: "abcd",
      },
    });

    try {
      await getOpenAPIS3Location({
        region: "eu-south-1",
        restApiId: "12312312",
      });
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("OpenAPI file location is not defined");
    }
  });
});
