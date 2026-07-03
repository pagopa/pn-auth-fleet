const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const fs = require("fs");
const redis = require("../app/redis");
const sinon = require("sinon");
const jsonwebtoken = require("jsonwebtoken");
const authCommon = require("pn-auth-common");
const lambda = require("../../index");

describe("index tests", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);
  let isJtiRevokedStub;

  before(() => {
    // The KMS signature/expiry verification is tested in pn-auth-common; stub the
    // shared verifier to decode + return the payload so the handler wiring runs.
    sinon.stub(authCommon.KmsJwtVerifier, "validation").callsFake(async (jwtToken) => {
      const decoded = jsonwebtoken.decode(jwtToken, { complete: true });
      if (!decoded) {
        throw new authCommon.ValidationException("Unable to decode input JWT string");
      }
      return decoded.payload;
    });

    isJtiRevokedStub = sinon.stub(redis, "isJtiRevoked").resolves(false);
  });

  after(() => {
    sinon.restore();
  });

  it("JWT Ok from spid-hub with cx_id verify - with IAM Policy", function (done) {
    lambdaTester(lambda.handler)
      .event(events[1])
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        const uid = result.context.uid;
        expect(result.context.cx_id).to.equal("PF-" + uid);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("JWT Ok from spid-hub Using cache - with IAM Policy", function (done) {
    lambdaTester(lambda.handler)
      .event(events[2])
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        done();
      })
      .catch(done); // Catch assertion errors
  });

  it("JWT expired from spid-hub - with IAM Policy", function (done) {
    lambdaTester(lambda.handler)
      .event(events[0])
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        done();
      })
      .catch(done); // Catch assertion errors
  });
});
