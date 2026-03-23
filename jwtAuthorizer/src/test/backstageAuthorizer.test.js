const { expect } = require("chai");
const sinon = require("sinon");
const { apiGatewayUtils, s3Utils } = require("pn-auth-common");

const { getSupportPolicy } = require("../app/backstageAuthorizer");

describe("test backstageAuthorizer", () => {
  let getApiGatewayTagsStub;
  let getAllowedResourcesFromS3Stub;

  before(() => {
    getApiGatewayTagsStub = sinon.stub(apiGatewayUtils, "getApiGatewayTags");
    getAllowedResourcesFromS3Stub = sinon.stub(s3Utils, "getAllowedResourcesFromS3");
  });

  afterEach(() => {
    getApiGatewayTagsStub.reset();
    getAllowedResourcesFromS3Stub.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should allow when user has permitted resources", async () => {
    getApiGatewayTagsStub.resolves({
      bucketName: "my-bucket",
      bucketKey: "my-key",
      servicePath: "notifications",
      apiName: undefined,
    });
    getAllowedResourcesFromS3Stub.resolves([{ method: "GET", path: "/items" }]);

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/notifications/items",
    };

    await getSupportPolicy(event, "admin");

    expect(event.servicePath).to.equal("notifications");
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
    expect(getApiGatewayTagsStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      restApiId: "abc123def",
    });
    expect(getAllowedResourcesFromS3Stub.calledOnce).to.be.true;
    expect(getAllowedResourcesFromS3Stub.firstCall.args[0]).to.deep.include({
      bucketName: "my-bucket",
      bucketKey: "my-key",
      userTags: ["admin"],
      tagName: "x-support-roles-permissions",
      requireTags: true,
    });
  });

  it("should throw when no resources are permitted", async () => {
    getApiGatewayTagsStub.resolves({
      bucketName: "my-bucket",
      bucketKey: "my-key",
      servicePath: "notifications",
      apiName: undefined,
    });
    getAllowedResourcesFromS3Stub.resolves([]);

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/notifications/items",
    };

    try {
      await getSupportPolicy(event, "viewer");
      expect.fail("should have thrown");
    } catch (error) {
      expect(error.message).to.equal("No statements defined for the policy");
    }
  });

  it("should skip permission check for logout api", async () => {
    getApiGatewayTagsStub.resolves({
      bucketName: undefined,
      bucketKey: undefined,
      servicePath: undefined,
      apiName: "logout",
    });

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/POST/",
    };

    await getSupportPolicy(event, "admin");

    expect(getAllowedResourcesFromS3Stub.called).to.be.false;
  });

});
