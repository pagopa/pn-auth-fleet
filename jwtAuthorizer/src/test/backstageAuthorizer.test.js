const { expect } = require("chai");
const sinon = require("sinon");
const { apiGatewayUtils } = require("pn-auth-common");
const policies = require("../policies");

const { getSupportPolicy } = require("../app/backstageAuthorizer");

describe("test backstageAuthorizer", () => {
  let getApiGatewayTagsStub;
  let buildSupportPolicyStub;
  let buildLogoutPolicyStub;

  const supportPolicyResult = { principalId: "user", policyDocument: {}, context: {} };
  const logoutPolicyResult = { principalId: "user", policyDocument: {}, context: {} };

  before(() => {
    getApiGatewayTagsStub = sinon.stub(apiGatewayUtils, "getApiGatewayTags");
    buildSupportPolicyStub = sinon.stub(policies, "buildSupportPolicy").returns(supportPolicyResult);
    buildLogoutPolicyStub = sinon.stub(policies, "buildLogoutPolicy").returns(logoutPolicyResult);
  });

  afterEach(() => {
    getApiGatewayTagsStub.reset();
    buildSupportPolicyStub.resetHistory();
    buildLogoutPolicyStub.resetHistory();
  });

  after(() => {
    sinon.restore();
  });

  it("should call buildSupportPolicy for GET requests without calling getApiGatewayTags", async () => {
    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result).to.equal(supportPolicyResult);
    expect(getApiGatewayTagsStub.called).to.be.false;
    expect(buildSupportPolicyStub.calledOnce).to.be.true;
    expect(buildSupportPolicyStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      awsAccountId: "123456789012",
      restApiId: "abc123def",
      stage: "prod",
      contextAttrs,
    });
    expect(buildLogoutPolicyStub.called).to.be.false;
  });

  it("should call buildSupportPolicy for POST requests when apiName is not logout", async () => {
    getApiGatewayTagsStub.resolves({ apiName: "delivery" });

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/POST/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result).to.equal(supportPolicyResult);
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
    expect(getApiGatewayTagsStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      restApiId: "abc123def",
    });
    expect(buildSupportPolicyStub.calledOnce).to.be.true;
    expect(buildLogoutPolicyStub.called).to.be.false;
  });

  it("should call buildLogoutPolicy for POST requests when apiName is logout", async () => {
    getApiGatewayTagsStub.resolves({ apiName: "logout" });

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/POST/",
    };
    const contextAttrs = { cx_role: "admin" };

    const result = await getSupportPolicy(event, contextAttrs);

    expect(result).to.equal(logoutPolicyResult);
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
    expect(buildLogoutPolicyStub.calledOnce).to.be.true;
    expect(buildLogoutPolicyStub.firstCall.args[0]).to.deep.equal({
      region: "eu-south-1",
      awsAccountId: "123456789012",
      restApiId: "abc123def",
      stage: "unique",
      contextAttrs,
    });
    expect(buildSupportPolicyStub.called).to.be.false;
  });

  it("should not call getApiGatewayTags for non-POST methods", async () => {
    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/OPTIONS/v1/notifications/sent",
    };
    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "viewer" };

    await getSupportPolicy(event, contextAttrs);

    expect(getApiGatewayTagsStub.called).to.be.false;
    expect(buildSupportPolicyStub.calledOnce).to.be.true;
  });
});
