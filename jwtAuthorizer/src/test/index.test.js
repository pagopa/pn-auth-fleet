import { expect } from "chai";
import lambdaTester from "lambda-tester";
import proxyquire from "proxyquire";
import fs from "fs";
import { mockClient } from "aws-sdk-client-mock";
import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";

import { generateIAMPolicy } from "../app/iamPolicyGen";
import { ValidationException } from "../app/exception/validationException.js";
import { validation } from "../app/validation.js";

const kmsClientMock = mockClient(KMSClient);

const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
  "./validation.js": { validation },
  "./iamPolicyGenerator.js": { generateIAMPolicy },
  "./exception/validationException.js": { ValidationException },
});

const lambda = proxyquire.noCallThru().load("../../index.js", {
  "./src/app/eventHandler.js": eventHandler,
});

describe("JWT Ok from spid-hub with cx_id verify", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);

  beforeEach(() => {
    kmsClientMock.reset();
  });

  it("with IAM Policy", function (done) {
    kmsClientMock.on(GetPublicKeyCommand).resolves({
      PublicKey:
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB",
    });
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
});

describe("JWT Ok from spid-hub Using cache", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);

  beforeEach(() => {
    kmsClientMock.reset();
  });

  it("with IAM Policy", function (done) {
    kmsClientMock.on(GetPublicKeyCommand).resolves({
      PublicKey:
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB",
    });
    lambdaTester(lambda.handler)
      .event(events[2])
      .expectResult((result) => {
        // Check if code exist
        //console.debug('the result is ', result);
        done();
      })
      .catch(done); // Catch assertion errors
  });
});

describe("JWT expired from spid-hub", function () {
  const eventFile = fs.readFileSync("event.json");
  const events = JSON.parse(eventFile);

  beforeEach(() => {
    kmsClientMock.reset();
  });

  it("with IAM Policy", function (done) {
    kmsClientMock.on(GetPublicKeyCommand).resolves({
      PublicKey:
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB",
    });
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
