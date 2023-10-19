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
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("test jwt verifier", async () => {
    sandbox.stub(process, "env").value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
      CLIENT_ID: "123131312132",
    });
    const payload = {
      jit: "123123",
    };
    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves(payload);

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(payload);
  });

  it("test jwt verifier when the USER_POOL_ARN is missing", async () => {
    sandbox.stub(process, "env").value({
      CLIENT_ID: "123131312132",
    });
    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the CLIENT_ID is missing", async () => {
    sandbox.stub(process, "env").value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
    });
    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const idToken = "token";
    const valid = await verifyIdToken(idToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the userpool is not valid", async () => {
    sandbox.stub(process, "env").value({
      USER_POOL_ARN: "arn:aws:cognito-idp:eu-central-1:123123123:userpool",
      CLIENT_ID: "123131312132",
    });
    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when it triggers exception", async () => {
    sandbox.stub(process, "env").value({
      USER_POOL_ARN:
        "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd",
      CLIENT_ID: "123131312132",
    });
    sandbox
      .stub(CognitoJwtVerifier.prototype, "verify")
      .rejects(new Error("AAA"));

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });
});
