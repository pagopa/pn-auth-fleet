const { mockClient } = require("aws-sdk-client-mock");
const {
  APIGatewayClient,
  GetTagsCommand,
} = require("@aws-sdk/client-api-gateway");
const { expect } = require("chai");

const { getApiGatewayTags } = require("../app/modules/utils/apiGatewayUtils");

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
        ApiName: "logout",
      },
    });

    const tags = await getApiGatewayTags({
      region: "eu-south-1",
      restApiId: "12312312",
    });

    expect(tags).to.deep.equal({
      bucketName: "1231",
      bucketKey: "abcd",
      servicePath: "api-key-bo",
      apiName: "logout",
    });
  });

  it("test tags extraction with missing tags", async () => {
    ddbMock.on(GetTagsCommand).resolves({
      tags: {
        PN_OPENAPI_BUCKET_KEY: "abcd",
      },
    });

    const tags = await getApiGatewayTags({
      region: "eu-south-1",
      restApiId: "12312312",
    });

    expect(tags).to.deep.equal({
      bucketName: undefined,
      bucketKey: "abcd",
      servicePath: undefined,
      apiName: undefined,
    });
  });
});
