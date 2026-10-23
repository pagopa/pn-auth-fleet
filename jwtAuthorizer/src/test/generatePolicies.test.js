const { expect } = require("chai");

const { pathToResource, buildPolicies } = require("../../scripts/generatePolicies");

const PREFIX = "arn:aws:execute-api:{region}:{awsAccountId}:{restApiId}/{stage}";

const openapiDoc = {
  paths: {
    "/v1/notifications/sent": {
      get: { "x-pn-allowed-cx-types": ["PA", "BS"] },
      post: { "x-pn-allowed-cx-types": ["PA"] },
      options: { "x-pn-allowed-cx-types": ["PA"] },
    },
    "/v1/notifications/sent/{iun}/documents/{documentType}": {
      get: { "x-pn-allowed-cx-types": ["PA"] },
    },
    "/v1/mandate": {
      post: { "x-pn-allowed-cx-types": ["PF", "PG"] },
    },
    "/v1/untagged": {
      get: {},
    },
    "/v1/any": {
      "x-amazon-apigateway-any-method": { "x-pn-allowed-cx-types": ["PG"] },
    },
  },
};

const resourcesOf = (policy) => policy.policyDocument.Statement[0].Resource;

describe("test generatePolicies", () => {
  describe("pathToResource", () => {
    it("should replace path params with wildcard", () => {
      expect(pathToResource("GET", "/v1/notifications/sent/{iun}/documents/{documentType}")).to.equal(
        `${PREFIX}/GET/v1/notifications/sent/*/documents/*`
      );
    });

    it("should keep paths without params unchanged", () => {
      expect(pathToResource("POST", "/v1/mandate")).to.equal(`${PREFIX}/POST/v1/mandate`);
    });
  });

  describe("buildPolicies", () => {
    const policies = buildPolicies(openapiDoc, ["PF", "PA", "PG", "BS"]);

    it("should generate allowed resources for each cx_type", () => {
      expect(resourcesOf(policies.PA)).to.deep.equal([
        `${PREFIX}/GET/v1/notifications/sent`,
        `${PREFIX}/GET/v1/notifications/sent/*/documents/*`,
        `${PREFIX}/POST/v1/notifications/sent`,
      ]);
      expect(resourcesOf(policies.PF)).to.deep.equal([`${PREFIX}/POST/v1/mandate`]);
      expect(resourcesOf(policies.BS)).to.deep.equal([`${PREFIX}/GET/v1/notifications/sent`]);
    });

    it("should map any-method to wildcard method", () => {
      expect(resourcesOf(policies.PG)).to.deep.equal([`${PREFIX}/*/v1/any`, `${PREFIX}/POST/v1/mandate`]);
    });

    it("should exclude untagged and options operations", () => {
      const all = Object.values(policies).flatMap(resourcesOf);
      expect(all.some((r) => r.includes("/v1/untagged"))).to.be.false;
      expect(all.some((r) => r.includes("/OPTIONS/"))).to.be.false;
    });

    it("should generate allow policies with the expected shape", () => {
      expect(policies.PA).to.deep.include({ principalId: "user", context: {} });
      expect(policies.PA.policyDocument.Statement[0]).to.deep.include({
        Action: "execute-api:Invoke",
        Effect: "Allow",
      });
    });

    it("should generate deny policy when cx_type has no operations", () => {
      const result = buildPolicies({ paths: { "/v1/untagged": { get: {} } } }, ["PF"]);

      expect(result.PF.policyDocument.Statement).to.deep.equal([
        { Action: "execute-api:Invoke", Effect: "Deny", Resource: `${PREFIX}/*` },
      ]);
    });

    it("should throw on unknown cx_type", () => {
      const doc = { paths: { "/v1/foo": { get: { "x-pn-allowed-cx-types": ["XX"] } } } };

      expect(() => buildPolicies(doc, ["PF"])).to.throw('Unknown cx_type "XX" on GET /v1/foo');
    });
  });
});
