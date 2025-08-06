const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const lambda = require("../../index");

describe("index tests", function () {
  let mock;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onPost(
        "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        "CGNNMO01T10A944Q"
      )
      .reply(200, "123e4567-e89b-12d3-a456-426655440000");
  });

  after(() => {
    mock.restore();
  });

  it("with IAM Policy", function (done) {
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

  it("with IAM Policy and valid sourceDetails", function (done) {
    const event = {
      type: "REQUEST",
      methodArn:
        "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
      resource: "/request",
      path: "/request",
      httpMethod: "GET",
      headers: {
        "x-pagopa-cx-taxid": "CGNNMO01T10A944Q",
        "x-pagopa-pn-io-src": "QR_CODE"
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

  it("with Invalid Source Details", function (done) {
    const event = {
      type: "REQUEST",
      methodArn:
        "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
      resource: "/request",
      path: "/request",
      httpMethod: "GET",
      headers: {
        "x-pagopa-cx-taxid": "CGNNMO01T10A944Q",
        "x-pagopa-pn-io-src": "INVALID_SOURCE"
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

     lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });

  it("Error method arn", function (done) {
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
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });

  it("Error Not taxId", function (done) {
    const event = {
      type: "REQUEST",
      methodArn: "arn:aws:execute-api:us-east-1:123456789012:swz6w548va/",
      requestContext: {
        identity: {
          apiKey: "123456789",
        },
      },
    };
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });

  it("Error iamPolicy", function (done) {
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
    lambdaTester(lambda.handler)
      .event(event)
      .expectResult((result) => {
        console.debug("the result is ", result);
        done();
      })
      .catch(done);
  });
});
