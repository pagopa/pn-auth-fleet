import { APIGatewayClient, GetTagsCommand } from "@aws-sdk/client-api-gateway";
import { mockClient } from "aws-sdk-client-mock";
import chai from "chai";
import lambdaTester from "lambda-tester";
import { lambdaHandler } from "../../index.js";

const awsMockResult = {
  tags: {
    pa_id: "fake_pa_id",
    cx_groups: "foo,bar",
  },
};

describe("Success", function () {
  const expect = chai.expect;
  const apiGatewayClientMock = mockClient(APIGatewayClient);

  beforeEach(() => {
    apiGatewayClientMock.reset();
  });

  const event = {
    type: "TOKEN",
    methodArn:
      "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/beta/POST/delivery/notifications/sent",
    requestContext: {
      identity: {
        apiKeyId: "4dlrwkp7a8",
      },
    },
  };

  it("with IAM Policy", function (done) {
    apiGatewayClientMock.on(GetTagsCommand).resolves(awsMockResult);
    lambdaTester(lambdaHandler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        let statement = result.policyDocument.Statement;
        console.debug("statement ", statement);
        expect(statement[0].Action).to.equal("execute-api:Invoke");
        expect(statement[0].Effect).to.equal("Allow");
        expect(result.context.cx_id).to.equal("fake_pa_id");
        expect(result.context.cx_type).to.equal("PA");
        expect(result.context.uid).to.equal("APIKEY-4dlrwkp7a8");
        expect(result.context.cx_groups).to.equal("foo,bar");
        done();
      })
      .catch(done);
  });

  it("Error method arn", function (done) {
    apiGatewayClientMock.on(GetTagsCommand).resolves(awsMockResult);
    // changing into bad method arn
    event.methodArn = "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/";
    lambdaTester(lambdaHandler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });
});
