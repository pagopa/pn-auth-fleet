const { expect } = require("chai");
import { getCognitoUserTags, verifyIdToken } from "../app/cognitoUtils";
const sinon = require("sinon");
import { CognitoJwtVerifier } from "aws-jwt-verify";

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
    process.env.USER_POOL_ARN =
      "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd";
    process.env.CLIENT_ID = "123131312132";

    const payload = {
      jit: "123123",
    };
    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves(payload);

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(payload);
  });

  it("test jwt verifier when the USER_POOL_ARN is missing", async () => {
    process.env.CLIENT_ID = "123131312132";
    delete process.env.USER_POOL_ARN;

    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the CLIENT_ID is missing", async () => {
    process.env.USER_POOL_ARN =
      "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd";
    delete process.env.CLIENT_ID;

    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const idToken = "token";
    const valid = await verifyIdToken(idToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when the userpool is not valid", async () => {
    process.env.USER_POOL_ARN =
      "arn:aws:cognito-idp:eu-central-1:123123123:userpool";
    process.env.CLIENT_ID = "123131312132";

    sandbox.stub(CognitoJwtVerifier.prototype, "verify").resolves({
      jit: "123123",
    });

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });

  it("test jwt verifier when it triggers exception", async () => {
    process.env.USER_POOL_ARN =
      "arn:aws:cognito-idp:eu-central-1:123123123:userpool/eu-central-1_abcd";
    process.env.CLIENT_ID = "123131312132";

    sandbox
      .stub(CognitoJwtVerifier.prototype, "verify")
      .rejects(new Error("AAA"));

    const accessToken = "token";
    const valid = await verifyIdToken(accessToken);
    expect(valid).equals(false);
  });
});
