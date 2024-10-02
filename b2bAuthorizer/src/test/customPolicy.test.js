const { expect } = require("chai");
const sinon = require("sinon");

const s3Utils = require("../app/modules/middleware/s3Utils.js");
const apiGatewayUtils = require("../app/modules/middleware/apiGatewayUtils.js");
const { getCustomPolicyDocument } = require("../app/modules/policy/customPolicy.js");

describe("Test auth policy", () => {
    let getAllowedResourcesFromS3Stub;
    let getOpenAPIS3LocationStub;
  
    before(() => {
      getAllowedResourcesFromS3Stub = sinon.stub(
        s3Utils,
        "getResourcesFromS3"
      );
      getOpenAPIS3LocationStub = sinon.stub(
        apiGatewayUtils,
        "getOpenAPIS3Location"
      );
    });
  
    after(() => {
      sinon.restore();
    });
  
    it("allow method", async () => {
      let called = 0;
      getAllowedResourcesFromS3Stub.callsFake(() => {
        called++;
        return [
        {
          path: "/test",
          method: "POST",
          tags: ["R"]
        },
      ]});
      getOpenAPIS3LocationStub.callsFake(() => ["REFINEMENT", "BASE", "api-key-bo"]);
  
      const lambdaEvent = {
        methodArn:
          "arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/aggregate",
        authorizationToken:
          'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q"',
        httpMethod: "POST",
      };
      let callableApiTags = ["REFINEMENT", "BASE"]
      let policy = await getCustomPolicyDocument(lambdaEvent, callableApiTags)
      let policyExpected = {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: ['arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/test']
          }
        ]
      }

      policy = await getCustomPolicyDocument(lambdaEvent, callableApiTags)

      policyExpected = {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: ['arn:aws:execute-api:eu-south-1:558518206506:0y0p7mcx54/unique/POST/test']
          }
        ]
      };
      
      expect(JSON.stringify(policyExpected)).equals(JSON.stringify(policy));
  
      expect(called).equals(1);

    });
  
  });
  