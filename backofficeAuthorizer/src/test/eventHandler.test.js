const { expect } = require("chai");
const sinon = require("sinon");

const s3Utils = require("../app/s3Utils.js");
const apiGatewayUtils = require("../app/apiGatewayUtils.js");
const cognitoUtils = require("../app/cognitoUtils.js");
const { handleEvent } = require("../app/eventHandler.js");

describe("Test auth policy", () => {
  let getAllowedResourcesFromS3Stub;
  let getOpenAPIS3LocationStub;
  let verifyIdTokenStub;

  before(() => {
    getAllowedResourcesFromS3Stub = sinon.stub(
      s3Utils,
      "getAllowedResourcesFromS3"
    );
    getOpenAPIS3LocationStub = sinon.stub(
      apiGatewayUtils,
      "getOpenAPIS3Location"
    );
    verifyIdTokenStub = sinon.stub(cognitoUtils, "verifyIdToken");
  });

  after(() => {
    sinon.restore();
  });

  it("allow method", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => ({
      "custom:backoffice_tags": "Aggregate",
    }));

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
      authorizationToken:
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    const authResponse = await handleEvent(event);
    console.log(JSON.stringify(authResponse.policyDocument));
    expect(authResponse.policyDocument.Statement[0].Effect).equals("Allow");
  });

  it("deny all on no resources", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => []);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => ({
      "custom:backoffice_tags": "Aggregate",
    }));

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
      authorizationToken:
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    const authResponse = await handleEvent(event);
    console.log(JSON.stringify(authResponse.policyDocument));
    expect(authResponse.policyDocument.Statement[0].Effect).equals("Deny");
  });

  it("multiple level path", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
      {
        path: "/test/*",
        method: "GET",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => ({
      "custom:backoffice_tags": "Aggregate",
    }));

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/v1/aggregate",
      authorizationToken:
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    const authResponse = await handleEvent(event);
    console.log(authResponse.policyDocument);
    expect(authResponse.policyDocument.Statement[0].Effect).equals("Allow");
  });

  it("invalid token", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => false);

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
      authorizationToken:
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    const authResponse = await handleEvent(event);
    console.log(authResponse.policyDocument);
    expect(authResponse.policyDocument.Statement[0].Effect).equals("Deny");
  });

  it("invalid bearer token", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.callsFake(() => false);

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
      authorizationToken:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    const authResponse = await handleEvent(event);
    expect(authResponse.policyDocument.Statement[0].Effect).equals("Deny");
  });

  it("deny on exception", async () => {
    getAllowedResourcesFromS3Stub.callsFake(() => [
      {
        path: "/test",
        method: "POST",
      },
    ]);
    getOpenAPIS3LocationStub.callsFake(() => ["bucket", "key", "api-key-bo"]);
    verifyIdTokenStub.throws(() => new Error("Invalid token"));

    const event = {
      methodArn:
        "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
      authorizationToken:
        'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
      httpMethod: "POST",
    };
    try {
      await handleEvent(event);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Invalid token");
    }
  });
});
