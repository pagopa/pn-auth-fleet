const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { KMSClient, GetPublicKeyCommand } = require("@aws-sdk/client-kms");

const { handleEvent } = require("../app/eventHandler");

describe("test eventHandler", () => {
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

  it("handle event without authorizationToken", async () => {
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken: "",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent",
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ]);
    expect(result.context).to.be.undefined;
  });

  it("handle event with error in generation (jwt expired)", async () => {
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoxNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.EcnBt1ZHD8Or00SgAP528lY4GcInWv3JfvtTER7_ago9Ef_patWOF1V38OZoUxKzaUrc-dZM7bQMS1PsinCcACyjZdf3D0lWiesftbBGTc221waF9vs7XOyvc1ckFSf7Qx9a1xWUPKETSqrMD7yZl7dHrWnsGLq-X_B7SQWNqd-kPFhXaD12ZYqKSRlMg35XNv2Ww491QqlzferTMBzyzUVf5JMoRjiTixdOaX420ncbRcs1jk91wiGCEqj7bTlGhQ-WIPlCcJRkLgrnj4jx6RAF8ncylfJGcp4NrIKarP82wIBglgTGZHC5TRsQbO_jFakXC8yX3Cvu8eN_T_XgPg",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent",
    });
    expect(result.principalId).to.be.equal("user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ]);
    expect(result.context).to.be.undefined;
  });

  it.only("handle event with no errors (PF)", async () => {
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
    });
  });
});
