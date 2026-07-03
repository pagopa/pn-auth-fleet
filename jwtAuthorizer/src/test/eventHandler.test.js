const { expect } = require("chai");
const redis = require("../app/redis");
const sinon = require("sinon");
const jsonwebtoken = require("jsonwebtoken");
const authCommon = require("pn-auth-common");

const { handleEvent } = require("../app/eventHandler");
const { denyAllPolicy } = require("../policies");

describe("test eventHandler", () => {
  let validationStub;
  let isJtiRevokedStub;

  beforeEach(() => {
    // The KMS signature/expiry verification is tested in pn-auth-common; here we
    // stub the shared verifier to decode + return the payload so the authorizer
    // logic (policy generation, jti revocation) can be exercised in isolation.
    validationStub = sinon
      .stub(authCommon.KmsJwtVerifier, "validation")
      .callsFake(async (jwtToken) => {
        const decoded = jsonwebtoken.decode(jwtToken, { complete: true });
        if (!decoded) {
          throw new authCommon.ValidationException("Unable to decode input JWT string");
        }
        return decoded.payload;
      });
    isJtiRevokedStub = sinon.stub(redis, "isJtiRevoked").resolves(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("handle event without authorizationToken", async () => {
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken: "",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent",
    });
    expect(result).to.be.equal(denyAllPolicy);
    expect(result.context).to.be.undefined;
  });

  it("handle event with error in generation (jwt expired)", async () => {
    validationStub.rejects(
      new authCommon.ValidationException(
        JSON.stringify({ name: "TokenExpiredError", message: "jwt expired" })
      )
    );
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoxNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.EcnBt1ZHD8Or00SgAP528lY4GcInWv3JfvtTER7_ago9Ef_patWOF1V38OZoUxKzaUrc-dZM7bQMS1PsinCcACyjZdf3D0lWiesftbBGTc221waF9vs7XOyvc1ckFSf7Qx9a1xWUPKETSqrMD7yZl7dHrWnsGLq-X_B7SQWNqd-kPFhXaD12ZYqKSRlMg35XNv2Ww491QqlzferTMBzyzUVf5JMoRjiTixdOaX420ncbRcs1jk91wiGCEqj7bTlGhQ-WIPlCcJRkLgrnj4jx6RAF8ncylfJGcp4NrIKarP82wIBglgTGZHC5TRsQbO_jFakXC8yX3Cvu8eN_T_XgPg",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent",
    });
    expect(result).to.be.equal(denyAllPolicy);
    expect(result.context).to.be.undefined;
  });

  it("handle event with no errors (PF)", async () => {
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received",
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource:
          "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/*",
      },
    ]);
    expect(result.context).to.be.eql({
      uid: "ed84b8c9-444e-410d-80d7-cfad6aa12070",
      cx_id: "PF-ed84b8c9-444e-410d-80d7-cfad6aa12070",
      cx_type: "PF",
      cx_groups: undefined,
      cx_role: undefined,
      cx_jti: "01G2A6V0B13BHNCPEZ32S7KQ3Y",
      sourceChannel: "WEB"
    });

    expect(isJtiRevokedStub.getCall(0).args).to.be.eqls(["01G2A6V0B13BHNCPEZ32S7KQ3Y"]);
  });

  it("handle event with no errors and source info (PA)", async () => {
    const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleUlkIn0.eyJpYXQiOjE3Mzk1MzM1MzcsImV4cCI6MTczOTU0MDczNywidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwiaXNzIjoicG4tZGV2ZWxvcC5wbi5wYWdvcGEuaXQiLCJhdWQiOiJ3ZWJhcGkuZGV2LnBuLnBhZ29wYS5pdCIsImp0aSI6IjAxRzBDRlc4MEhHVFRXMFJINTRXUUQ2RjZTIiwib3JnYW5pemF0aW9uIjp7ImlkIjoiMDI2ZThjNzItNzk0NC00ZGNkLTg2NjgtZjU5NjQ0N2ZlYzZkIiwicm9sZSI6ImFkbWluIiwiZ3JvdXBzIjpbIjYyZTk0MWQzMTNiMGZjNmVkYWQ0NTM1YSJdLCJmaXNjYWxfY29kZSI6IjAxMTk5MjUwMTU4In0sInNvdXJjZSI6eyJjaGFubmVsIjoiVFBQIiwiZGV0YWlscyI6IjBlM2JlZTI5LTg3NTMtNDQ3Yy1iMGRhLTFmNzk2NTU1OGVjMi0xNzA2ODY3OTYwOTAwIiwicmV0cmlldmFsSWQiOiIwZTRjNjYyOS04NzUzLTIzNHMtYjBkYS0xZjc5Njk5OWVjMi0xNTAzODYzNzk2MDkyMCJ9fQ.c2lnbmF0dXJl";
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken: token,
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received",
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource:
          "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/*",
      },
    ]);
    expect(result.context).to.be.eql({
      uid: "ed84b8c9-444e-410d-80d7-cfad6aa12070",
      cx_id: "026e8c72-7944-4dcd-8668-f596447fec6d",
      cx_type: "PA",
      cx_groups: "62e941d313b0fc6edad4535a",
      cx_role: "admin",
      cx_jti: "01G0CFW80HGTTW0RH54WQD6F6S",
      sourceChannel: "TPP",
      sourceChannelDetails: "0e3bee29-8753-447c-b0da-1f7965558ec2-1706867960900"
    });

      expect(isJtiRevokedStub.getCall(0).args).to.be.eqls(["01G0CFW80HGTTW0RH54WQD6F6S"]);

  });

  it("handle event with no errors (BS) - cx_id without prefix", async () => {
    sinon.stub(authCommon.apiGatewayUtils, "getApiGatewayTags").resolves({
      apiName: undefined,
    });

    const bsToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleUlkIn0.eyJpYXQiOjE3Mzk1MzM1MzcsImV4cCI6MTczOTU0MDczNywidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwiaXNzIjoicG4tZGV2ZWxvcC5wbi5wYWdvcGEuaXQiLCJhdWQiOiJ3ZWJhcGkuZGV2LnBuLnBhZ29wYS5pdCIsImp0aSI6IjAxRzBDRlc4MEhHVFRXMFJINTRXUUQ2RjZTIiwib3JnYW5pemF0aW9uIjp7ImlkIjoiMDI2ZThjNzItNzk0NC00ZGNkLTg2NjgtZjU5NjQ0N2ZlYzZkIiwicm9sZSI6InN1cHBvcnQiLCJncm91cHMiOlsiNjJlOTQxZDMxM2IwZmM2ZWRhZDQ1MzVhIl0sImZpc2NhbF9jb2RlIjoiMDExOTkyNTAxNTgifX0.c2lnbmF0dXJl";
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken: bsToken,
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received",
    });

    expect(result.context.cx_type).to.equal("BS");
    expect(result.context.cx_id).to.equal("026e8c72-7944-4dcd-8668-f596447fec6d");
    expect(result.context.cx_role).to.equal("support");

  });

  it("handle event with jti revoked", async () => {
    isJtiRevokedStub.resolves(true);
    const result =  await handleEvent({
        type: "TOKEN",
        authorizationToken:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q",
        methodArn:
          "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received",
    });

    expect(result).to.be.equal(denyAllPolicy);
    expect(isJtiRevokedStub.getCall(0).args).to.be.eqls(["01G2A6V0B13BHNCPEZ32S7KQ3Y"]);
  });
});
