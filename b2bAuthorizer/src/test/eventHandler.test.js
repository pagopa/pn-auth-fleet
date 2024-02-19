const { expect } = require("chai");

const { handleEvent } = require("../app/eventHandler");

describe("test eventHandler", () => {

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

  it("handle event with no errors (PF)", async () => {
    const result = await handleEvent({
      type: "TOKEN",
      authorizationToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q",
      methodArn:
        "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received",
    });
    expect(result.principalId).to.be.equal("fake-user");
    expect(result.policyDocument.Statement).to.be.eql([
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource:
          "*",
      },
    ]);
    expect(result.context).to.be.eql({
      cx_type: "FAKE_cx_type",
      cx_id: "FAKE_cx_id",
      cx_groups: "FAKE_cx_groups",
      cx_role: "FAKE_cx_role",
      uid: "FAKE_uid",
      cx_jti: "FAKE_cx_jti",
      sourceChannel: "FAKE_sourceChannel",
      sourceChannelDetails: null,
      applicationRole: "FAKE_applicationRole",
      allowedApplicationRoles: null,
      callableApiTags: null
    });
  });
});
