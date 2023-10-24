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
      PublicKey: new Uint8Array([
        48, 130, 1, 34, 48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0,
        3, 130, 1, 15, 0, 48, 130, 1, 10, 2, 130, 1, 1, 0, 157, 34, 97, 186, 80,
        41, 131, 250, 205, 0, 88, 200, 66, 112, 98, 111, 55, 218, 63, 131, 134,
        61, 166, 109, 54, 234, 139, 118, 36, 38, 56, 76, 245, 226, 8, 110, 194,
        98, 208, 252, 119, 14, 123, 172, 87, 226, 38, 7, 191, 219, 199, 39, 187,
        111, 102, 109, 48, 27, 68, 63, 164, 241, 29, 135, 233, 218, 128, 146,
        231, 141, 246, 228, 186, 36, 84, 56, 13, 230, 44, 199, 162, 137, 139,
        184, 26, 91, 73, 87, 56, 196, 199, 154, 127, 97, 165, 29, 25, 114, 219,
        78, 126, 72, 254, 172, 166, 0, 126, 254, 106, 250, 229, 14, 191, 101,
        191, 196, 122, 202, 202, 77, 167, 188, 182, 96, 247, 189, 228, 232, 236,
        28, 115, 133, 114, 4, 150, 152, 32, 229, 85, 203, 228, 136, 17, 220,
        161, 57, 229, 234, 62, 100, 81, 64, 165, 49, 124, 215, 170, 236, 105,
        91, 142, 98, 189, 74, 80, 108, 141, 255, 119, 59, 109, 233, 51, 18, 32,
        53, 236, 96, 252, 141, 58, 61, 113, 30, 184, 224, 35, 205, 183, 227, 37,
        194, 82, 16, 145, 191, 232, 237, 1, 126, 223, 251, 100, 145, 252, 55,
        225, 253, 189, 86, 40, 193, 14, 181, 74, 53, 42, 245, 199, 212, 166,
        249, 179, 219, 57, 85, 167, 98, 204, 211, 118, 146, 18, 185, 10, 54,
        162, 173, 187, 38, 88, 237, 100, 37, 151, 2, 74, 186, 58, 241, 229, 222,
        109, 198, 251, 29, 2, 3, 1, 0, 1,
      ]),
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
