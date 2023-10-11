const { expect } = require("chai");
const sinon = require("sinon");

const {
  findAttributeValueInObjectWithInsensitiveCase,
  anonymizeKey,
  logEvent,
  logIamPolicy,
} = require("../app/utils");
const { mockIamPolicyOk } = require("./mocks");

describe("Test anonymize function", () => {
  it("anonymize with length > 6", () => {
    let text = "test-clear";
    let anonymized = anonymizeKey(text);
    expect(anonymized).equals("te******ar");
  });

  it("anonymize with length < 6", () => {
    let text = "test";
    let anonymized = anonymizeKey(text);
    expect(anonymized).equals("****");
  });
});

describe("Test logEvent", () => {
  it("", () => {
    let spy = sinon.spy(console, "info");
    let mockedEvent = {
      path: "/request",
      httpMethod: "GET",
      headers: {
        "x-api-key": "datatohide",
        "X-Amzn-Trace-Id": "test",
      },
    };
    logEvent(mockedEvent);
    let expectedEvent = {
      httpMethod: "GET",
      path: "/request",
      "X-Amzn-Trace-Id": "test",
      "x-api-key": "da******de",
    };
    expect(
      spy
        .getCall(0)
        .calledWith("New event received", sinon.match(expectedEvent))
    ).to.be.true;
    spy.restore();
  });
});

describe("Test logIamPolicy", () => {
  it("", () => {
    let spy = sinon.spy(console, "log");
    logIamPolicy(mockIamPolicyOk);
    let expectedIamPolicy = {
      principalId: "testPrincipal",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "arn",
          },
        ],
      },
      context: {
        uid: "APIKEY-te******ey",
        cx_id: "cxId",
        cx_groups: "group1,group2",
        cx_type: "PA",
      },
      usageIdentifierKey: "te******ey",
    };
    expect(
      spy.getCall(0).calledWith("IAM Policy:", sinon.match(expectedIamPolicy))
    ).to.be.true;
    spy.restore();
  });
});

describe("Test findAttributeValueInObjectWithInsensitiveCase", () => {
  it("item found", () => {
    let object = {
      key: "test",
    };
    const value = findAttributeValueInObjectWithInsensitiveCase(object, "KEY");
    expect(value).equals("test");
  });

  it("item not found", () => {
    let object = {
      key: "test",
    };
    const value = findAttributeValueInObjectWithInsensitiveCase(object, "foo");
    expect(value).to.be.undefined;
  });
});
