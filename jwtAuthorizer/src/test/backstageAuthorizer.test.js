const { expect } = require("chai");
const sinon = require("sinon");
const { apiGatewayUtils } = require("pn-auth-common");

const { getSupportPolicy } = require("../app/backstageAuthorizer");

describe("test backstageAuthorizer", () => {
  let getApiGatewayTagsStub;

  before(() => {
    getApiGatewayTagsStub = sinon.stub(apiGatewayUtils, "getApiGatewayTags");
  });

  afterEach(() => {
    getApiGatewayTagsStub.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should return support policy for GET requests", async () => {
    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.principalId).to.equal("user");
    expect(result.policyDocument.Statement).to.have.lengthOf(1);
    expect(result.policyDocument.Statement[0].Resource).to.be.an("array");
    expect(result.policyDocument.Statement[0].Resource[0]).to.equal(
      "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/v1/notifications/sent"
    );
    expect(result.context).to.deep.equal(contextAttrs);
    expect(getApiGatewayTagsStub.called).to.be.false;
  });

  it("should return support policy for POST requests when apiName is not logout", async () => {
    getApiGatewayTagsStub.resolves({ apiName: "delivery" });

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/POST/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.policyDocument.Statement[0].Resource).to.be.an("array");
    expect(result.policyDocument.Statement[0].Resource[0]).to.include("/prod/GET/");
    expect(result.context).to.deep.equal(contextAttrs);
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
    expect(getApiGatewayTagsStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      restApiId: "abc123def",
    });
  });

  it("should return logout policy for logout api", async () => {
    getApiGatewayTagsStub.resolves({ apiName: "logout" });

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/POST/",
    };
    const contextAttrs = { cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.principalId).to.equal("user");
    expect(result.policyDocument.Statement[0].Resource).to.deep.equal([
      "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/POST/",
    ]);
    expect(result.context).to.deep.equal(contextAttrs);
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
  });

  it("should not call getApiGatewayTags for non-POST methods", async () => {
    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/OPTIONS/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "viewer" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.context).to.deep.equal(contextAttrs);
    expect(getApiGatewayTagsStub.called).to.be.false;
  });

  it("should correctly replace all placeholders in support policy resources", async () => {
    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:111111111111:xyz789/staging/GET/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-2", cx_type: "BS", cx_role: "viewer" };

    const result = await getSupportPolicy(event, contextAttrs);

    for (const resource of result.policyDocument.Statement[0].Resource) {
      expect(resource).to.include("eu-south-1");
      expect(resource).to.include("111111111111");
      expect(resource).to.include("xyz789");
      expect(resource).to.include("/staging/");
      expect(resource).to.not.include("{region}");
      expect(resource).to.not.include("{awsAccountId}");
      expect(resource).to.not.include("{restApiId}");
      expect(resource).to.not.include("{stage}");
    }
  });
});
