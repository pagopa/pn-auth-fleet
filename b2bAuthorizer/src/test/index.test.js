const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const fs = require("fs");

const lambda = require("../../index");

describe("index tests", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);
  
  it("JWT Ok - with IAM Policy", function (done) {
    lambdaTester(lambda.handler)
      .event(events[0])
      .expectResult((result) => {
        // Check if code exist
        console.debug("the result is ", result);
        const uid = result.context.uid;
        expect(result.context.cx_id).to.equal("FAKE_cx_id");
        done();
      })
      .catch(done); // Catch assertion errors
  });
});
