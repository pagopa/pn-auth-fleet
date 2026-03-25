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

  it("should allow only GET methods for BS users", async () => {
    getApiGatewayTagsStub.resolves({
      apiName: undefined,
    });

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/notifications/items",
    };

    const contextAttrs = { uid: "user-1", cx_type: "BS", cx_role: "admin" };
    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.policyDocument.Statement).to.deep.equal([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: [
          "arn:aws:execute-api:eu-south-1:123456789012:abc123def/prod/GET/*",
        ],
      },
    ]);
    expect(result.context).to.deep.equal(contextAttrs);
    expect(getApiGatewayTagsStub.calledOnce).to.be.true;
  });

  it("should allow all methods for logout api", async () => {
    getApiGatewayTagsStub.resolves({
      apiName: "logout",
    });

    const event = {
      methodArn: "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/POST/",
    };

    const contextAttrs = { cx_role: "admin" };
    const result = await getSupportPolicy(event, contextAttrs);

    expect(result.context).to.deep.equal(contextAttrs);
    expect(result.policyDocument.Statement).to.deep.equal([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: [
          "arn:aws:execute-api:eu-south-1:123456789012:abc123def/unique/*/*",
        ],
      },
    ]);
  });

});
