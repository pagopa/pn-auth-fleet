const { expect } = require("chai");
const sinon = require("sinon");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const { getCognitoUserTags, verifyIdToken } = require("../app/cognitoUtils");

describe("cognito tests", function () {
  it("test cognito get user tag", async () => {
    const idTokenPayload = {
      "custom:backoffice_tags": "Aggregate",
    };
    const tags = getCognitoUserTags(idTokenPayload);

    expect(tags).deep.equal(["Aggregate"]);
  });

  it("test cognito get user tag, empty attribute", async () => {
    const idTokenPayload = {};

    const tags = getCognitoUserTags(idTokenPayload);

    expect(tags).deep.equal([]);
  });

  it("test cognito get user tag trim", async () => {
    const idTokenPayload = {
      "custom:backoffice_tags": "Aggregate , Aggregate1 ",
    };
    const tags = getCognitoUserTags(idTokenPayload);

    expect(tags).deep.equal(["Aggregate", "Aggregate1"]);
  });
});

describe("jwt verifier", function () {
  let processStub;
  let tokenVerify;

  before(() => {
    processStub = sinon.stub(process, "env");
    tokenVerify = sinon.stub(CognitoJwtVerifier.prototype, "verify");
  });

  after(() => {
    sinon.restore();
  });

  it("test jwt verifier", async () => {
    processStub.value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
      CLIENT_ID: "123131312132",
    });
    const payload = {
      jit: "123123",
    };
    tokenVerify.resolves(payload);

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(payload);
  });

  it("test jwt verifier when the USER_POOL_ARN is missing", async () => {
    processStub.value({
      CLIENT_ID: "123131312132",
    });
    tokenVerify.resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the CLIENT_ID is missing", async () => {
    processStub.value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
    });
    tokenVerify.resolves({
      jit: "123123",
    });

    const idToken = "token";
    const valid = await verifyIdToken(idToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the userpool is not valid", async () => {
    processStub.value({
      USER_POOL_ARN: "arn:aws:cognito-idp:eu-central-1:123123123:userpool",
      CLIENT_ID: "123131312132",
    });
    tokenVerify.resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when it triggers exception", async () => {
    processStub.value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
      CLIENT_ID: "123131312132",
    });
    tokenVerify.rejects(new Error("AAA"));

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });
});
