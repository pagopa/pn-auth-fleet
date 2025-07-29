const { expect } = require("chai");
const sinon = require("sinon");

const s3Utils = require("../app/s3Utils.js");
const apiGatewayUtils = require("../app/apiGatewayUtils.js");
const cognitoUtils = require("../app/cognitoUtils.js");
const event = require("../../event.json");
const lambda = require("../../index");

describe("index tests", function () {
  let getAllowedResourcesFromS3Stub;
  let getOpenAPIS3LocationStub;
  let verifyIdTokenStub;

  before(() => {
    getAllowedResourcesFromS3Stub = sinon.stub(
      s3Utils,
      "getAllowedResourcesFromS3"
    );
    getOpenAPIS3LocationStub = sinon.stub(
      apiGatewayUtils,
      "getOpenAPIS3Location"
    );
    verifyIdTokenStub = sinon.stub(cognitoUtils, "verifyIdToken");
  });

  after(() => {
    sinon.restore();
  });

  it("test Ok", async () => {
    const tokenPayload = {
      "custom:backoffice_tags": "Aggregate",
      sub: "464ee270-6021-7014-1ae4-b097b4c53ba8",
    };

    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => tokenPayload);
    const res = await lambda.handler(event, null);

    expect(res).to.deep.equal({
      principalId: event.authorizationToken,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: [
              "arn:aws:execute-api:eu-south-1:830192246553:3y4rrxvkv4/unique/POST/test",
            ],
          },
        ],
      },
      context: { uid: tokenPayload.sub, cx_type: "BO", cx_id: `BO-${tokenPayload.sub}`},
    });
  });

  it("test fail", async () => {
    const tokenPayload = {
      "custom:backoffice_tags": "Aggregate",
      sub: "464ee270-6021-7014-1ae4-b097b4c53ba8",
    };

    getAllowedResourcesFromS3Stub.callsFake(() => []);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => tokenPayload);
    const res = await lambda.handler(event, null);

    expect(res).to.deep.equal({
      principalId: event.authorizationToken,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: [
              "arn:aws:execute-api:eu-south-1:830192246553:3y4rrxvkv4/unique/*/*",
            ],
          },
        ],
      },
      context: { uid: tokenPayload.sub, cx_type: "BO", cx_id: `BO-${tokenPayload.sub}`},
    });
  });
});
