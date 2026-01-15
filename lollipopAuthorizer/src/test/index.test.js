const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

//const lambda = require("../../index");

describe("index tests", function () {
  let mock;
  let stubs;
  let lambda;
  const BASE_URL = "http://mock-url:8080";
  const expectedUrl = `${BASE_URL}/datavault-private/v1/recipients/external/PF`;
  const lollipopBlock = false;

  before(() => {
    process.env.PN_DATA_VAULT_BASEURL = BASE_URL;
    process.env.LOLLIPOP_BLOCK = lollipopBlock;
    stubs = {
      validateLollipopAuthorizer: sinon.stub(),
    };

    const eventHandlerMock = proxyquire("../app/eventHandler", {
      './lollipopAuthorizerValidation': { validateLollipopAuthorizer: stubs.validateLollipopAuthorizer }
    });

    lambda = proxyquire("../../index", {
      "./src/app/eventHandler": eventHandlerMock
    });

    mock = new MockAdapter(axios);
   /* mock
      .onPost(
        "http://${ApplicationLoadBalancerDomain}:8080/datavault-private/v1/recipients/external/PF",
        "CGNNMO01T10A944Q"
      )
      .reply(200, "123e4567-e89b-12d3-a456-426655440000");
      */
  });

    after(() => {
        mock.restore();
        sinon.restore();
        delete process.env.PN_DATA_VAULT_BASEURL;
      });

  it("TEST 1: with IAM Policy - Success", function (done) {

    const taxId = "CGNNMO01T10A944Q";
    const cxId = "123e4567-e89b-12d3-a456-426655440000";

    stubs.validateLollipopAuthorizer.resolves({
      statusCode: 200,
      resultCode: "ASSERTION_VERIFICATION_SUCCESS",
      name: "Mario",
      familyName: "Rossi"
    });

    mock
      .onPost(expectedUrl, taxId)
      .reply(200, cxId);

    const event = {
      type: "REQUEST",
      methodArn:
        "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request",
      resource: "/request",
      path: "/request",
      httpMethod: "GET",
      headers: {
        "x-pagopa-cx-taxid": taxId,
        "x-pagopa-lollipop-assertion-type": "SAML"
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
        // Verifiche sulla Policy
        expect(statement[0].Action).to.equal("execute-api:Invoke");
        expect(statement[0].Effect).to.equal("Allow");
        expect(result.context.cx_id).to.equal(cxId);
        expect(result.context.name).to.equal("Mario");
        expect(result.context.uid).to.equal(`IO-${cxId}`);
        expect(result.context.cx_type).to.equal("PF");
        //expect(result.context.uid).to.equal("IO-123e4567-e89b-12d3-a456-426655440000");
        done();
      })
      .catch(done);
  });

    it("TEST 2: User Not Found - Should return Deny", function (done) {
      const taxId = "TAX_NOT_EXIST";

      // imposto validateLollipopAuthorizer success
      stubs.validateLollipopAuthorizer.resolves({ statusCode: 200, resultCode: "SUCCESS" });

      // Axios restituisce null o vuoto (utente non trovato)
      mock.onPost(expectedUrl, taxId).reply(200, null);

      const event = {
        headers: { "x-pagopa-cx-taxid": taxId },
        methodArn: "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request"
      };

      lambdaTester(lambda.handler)
        .event(event)
        .expectResult((result) => {
          // Verifichiamo che sia DENY
          expect(result.policyDocument.Statement[0].Effect).to.equal("Deny");
          // Verifichiamo che la risorsa sia "*" (deny all)
          expect(result.policyDocument.Statement[0].Resource).to.equal("*");
          done();
        })
        .catch(done);
    });

    it("TEST 3: Data Vault returns 500 - Should return Deny", function (done) {
        const taxId = "CGNNMO01T10A944Q";

        // validateLollipopAuthorizer success
        stubs.validateLollipopAuthorizer.resolves({
          statusCode: 200,
          resultCode: "ASSERTION_VERIFICATION_SUCCESS"
        });

        // Axios fallisce con 500
        mock.onPost(expectedUrl, taxId).reply(500);

        const event = {
          headers: { "x-pagopa-cx-taxid": taxId },
          methodArn: "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request"
        };

        lambdaTester(lambda.handler)
          .event(event)
          .expectResult((result) => {
            // Verifichiamo che scatti il catch e restituisca la policy di Deny
            expect(result.policyDocument.Statement[0].Effect).to.equal("Deny");
            expect(result.policyDocument.Statement[0].Resource).to.equal("*");
            done();
          })
          .catch(done);
      });


    it("TEST 4: Data Vault Timeout - Should return Deny", function (done) {
        const taxId = "CGNNMO01T10A944Q";

        stubs.validateLollipopAuthorizer.resolves({ statusCode: 200 });

        // Simula un errore di timeout
        mock.onPost(expectedUrl, taxId).timeout();

        const event = {
          headers: { "x-pagopa-cx-taxid": taxId },
          methodArn: "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request"
        };

        lambdaTester(lambda.handler)
          .event(event)
          .expectResult((result) => {
            expect(result.policyDocument.Statement[0].Effect).to.equal("Deny");
            done();
          })
          .catch(done);
      });


  it("TEST 5: Error method arn", function (done) {
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


  it("TEST 6: Error Not taxId", function (done) {
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



  it("TEST 7: Error iamPolicy", function (done) {
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
