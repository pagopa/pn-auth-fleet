import { APIGatewayClient, GetTagsCommand } from "@aws-sdk/client-api-gateway";
import { mockClient } from "aws-sdk-client-mock";
import chai from "chai";
import handleEvent from "../app/eventHandler.js";

describe("test eventHandler", () => {
  const expect = chai.expect;
  const apiGatewayClientMock = mockClient(APIGatewayClient);

  beforeEach(() => {
    apiGatewayClientMock.reset();
  });

  it("handle event without apiKey", async () => {
    apiGatewayClientMock.on(GetTagsCommand).rejects({
      $metadata: {
        httpStatusCode: 404,
      },
    });
    const result = await handleEvent({
      type: "TOKEN",
      methodArn:
        "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/beta/POST/delivery/notifications/sent",
      requestContext: {
        identity: {
          apiKeyId: "",
        },
      },
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ]);
    expect(result.context).to.be.undefined;
  });

  it("handle event with error in generation (wrong arn)", async () => {
    apiGatewayClientMock.on(GetTagsCommand).rejects({
      $metadata: {
        httpStatusCode: 404,
      },
    });
    const result = await handleEvent({
      type: "TOKEN",
      methodArn: "arn:aws:execute-api:us-east-1:123456789012:swz6w548va",
      requestContext: {
        identity: {
          apiKeyId: "4dlrwkp7a8",
        },
      },
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ]);
    expect(result.context).to.be.undefined;
  });

  it("handle event with no errors", async () => {
    apiGatewayClientMock.on(GetTagsCommand).resolves({
      tags: {
        pa_id: "fake_pa_id",
        cx_groups: "foo,bar",
      },
    });
    const result = await handleEvent({
      type: "TOKEN",
      methodArn:
        "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/beta/POST/delivery/notifications/sent",
      requestContext: {
        identity: {
          apiKeyId: "4dlrwkp7a8",
        },
      },
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource:
          "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/beta/*",
      },
    ]);
    expect(result.context).to.be.eql({
      cx_id: "fake_pa_id",
      cx_type: "PA",
      cx_groups: "foo,bar",
      uid: "APIKEY-4dlrwkp7a8",
    });
  });
});
