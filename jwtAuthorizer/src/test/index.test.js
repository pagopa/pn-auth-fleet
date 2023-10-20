const { expect } = require("chai");
const lambdaTester = require("lambda-tester");
const fs = require("fs");
const { mockClient } = require("aws-sdk-client-mock");
const { KMSClient, GetPublicKeyCommand } = require("@aws-sdk/client-kms");

const lambda = require("../../index");

describe("index tests", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);
  let kmsClientMock;

  before(() => {
    kmsClientMock = mockClient(KMSClient);
    kmsClientMock.on(GetPublicKeyCommand).resolves({
      PublicKey:
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB",
    });
  });

  after(() => {
    kmsClientMock.reset();
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
        //console.debug('the result is ', result);
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
