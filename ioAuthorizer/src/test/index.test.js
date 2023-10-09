import { expect } from "chai";
import lambdaTester from "lambda-tester";
import proxyquire from "proxyquire";
import * as iamPolicyGen from "../app/iamPolicyGen";

const dataVaultClientMock = {
  getCxId: async function (taxId) {
    return "123e4567-e89b-12d3-a456-426655440000";
  },
};

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./iamPolicyGenerator.js": iamPolicyGen,
  "./dataVaultClient.js": dataVaultClientMock,
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});

describe("Success", function () {
  const event = {
    type: "REQUEST",
    methodArn:
      "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
    resource: "/request",
    path: "/request",
    httpMethod: "GET",
    headers: {
      "x-pagopa-cx-taxid": "CGNNMO01T10A944Q",
    },
    requestContext: {
      path: "/request",
      accountId: "123456789012",
      resourceId: "05c7jb",
      stage: "test",
      requestId: "123456789123456789",
      identity: {
        apiKey: "123456789",
      },
    },
    resourcePath: "/request",
    apiId: "abcdef123",
  };

  it("with IAM Policy", function (done) {
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        const statement = result.policyDocument.Statement;
        console.debug("statement ", statement);
        expect(statement[0].Action).to.equal("execute-api:Invoke");
        expect(statement[0].Effect).to.equal("Allow");
        expect(result.context.cx_id).to.equal(
          "123e4567-e89b-12d3-a456-426655440000"
        );
        expect(result.context.cx_type).to.equal("PF");
        expect(result.context.uid).to.equal(
          "IO-123e4567-e89b-12d3-a456-426655440000"
        );
        done();
      })
      .catch(done);
  });
});

describe("Error", function () {
  const event = {
    type: "REQUEST",
    methodArn: "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/",
    headers: {
      "x-pagopa-cx-taxid": "NOTEXISTS",
    },
    requestContext: {
      identity: {
        apiKey: "123456789",
      },
    },
  };

  it("Error method arn", function (done) {
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });
});

describe("Error No TaxId", function () {
  const event = {
    type: "REQUEST",
    methodArn: "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/",
    requestContext: {
      identity: {
        apiKey: "123456789",
      },
    },
  };

  it("Error Not taxId", function (done) {
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });
});

describe("Error iamPolicy", function () {
  const event = {
    type: "REQUEST",
    methodArn: "fake.method.arn",
    headers: {
      "x-pagopa-cx-taxid": "CGNNMO01T10A944Q",
    },
    requestContext: {
      identity: {
        apiKey: "123456789",
      },
    },
  };

  it("Error iamPolicy", function (done) {
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });
});
