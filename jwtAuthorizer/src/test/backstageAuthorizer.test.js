const { expect } = require("chai");
const sinon = require("sinon");
const { apiGatewayUtils, s3Utils } = require("pn-auth-common");

const { hasSupportPermission } = require("../app/backstageAuthorizer");

describe("test backstageAuthorizer", () => {
  let getOpenAPIS3LocationStub;
  let getAllowedResourcesFromS3Stub;

  before(() => {
    getOpenAPIS3LocationStub = sinon.stub(apiGatewayUtils, "getOpenAPIS3Location");
    getAllowedResourcesFromS3Stub = sinon.stub(s3Utils, "getAllowedResourcesFromS3");
  });

  afterEach(() => {
    getOpenAPIS3LocationStub.reset();
    getAllowedResourcesFromS3Stub.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should allow when user has permitted resources", async () => {
    getOpenAPIS3LocationStub.resolves(["my-bucket", "my-key", "notifications"]);
    getAllowedResourcesFromS3Stub.resolves([{ method: "GET", path: "/items" }]);

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/notifications/items",
    };

    await hasSupportPermission(event, "admin");

    expect(event.servicePath).to.equal("notifications");
    expect(getOpenAPIS3LocationStub.calledOnce).to.be.true;
    expect(getOpenAPIS3LocationStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      restApiId: "abc123def",
    });
    expect(getAllowedResourcesFromS3Stub.calledOnce).to.be.true;
    expect(getAllowedResourcesFromS3Stub.firstCall.args[0]).to.deep.include({
      bucket: "my-bucket",
      key: "my-key",
      userTags: ["admin"],
      tagName: "x-support-roles-permissions",
      requireTags: true,
    });
  });

  it("should throw when no resources are permitted", async () => {
    getOpenAPIS3LocationStub.resolves(["my-bucket", "my-key", "notifications"]);
    getAllowedResourcesFromS3Stub.resolves([]);

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/notifications/items",
    };

    try {
      await hasSupportPermission(event, "viewer");
      expect.fail("should have thrown");
    } catch (error) {
      expect(error.message).to.equal("No resource permitted");
    }
  });
});
