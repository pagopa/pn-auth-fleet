const { expect } = require("chai");

const { pathToResource, buildPolicies } = require("./generatePolicies");

const PREFIX = "arn:aws:execute-api:{region}:{awsAccountId}:{restApiId}/{stage}";
const ANY = "x-amazon-apigateway-any-method";

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

    it("should not add a deny statement when no excluded route is covered", () => {
      expect(policies.PA.policyDocument.Statement).to.have.lengthOf(1);
    });

    describe("routes covered by path param wildcards", () => {
      const overlapping = buildPolicies(
        {
          paths: {
            "/v1/notifications/received/{iun}": { get: { "x-pn-allowed-cx-types": ["PF", "PG"] } },
            "/v1/notifications/received/delegated": { get: { "x-pn-allowed-cx-types": ["PG"] } },
            "/v1/notifications/received/check-tpp": { get: { "x-pn-allowed-cx-types": ["PF"] } },
            "/v1/notifications/received/{iun}/private": { get: {} },
          },
        },
        ["PF", "PG"]
      );

      it("should deny to PF the PG-only static route covered by its wildcard", () => {
        expect(overlapping.PF.policyDocument.Statement[1]).to.deep.equal({
          Action: "execute-api:Invoke",
          Effect: "Deny",
          Resource: [
            `${PREFIX}/GET/v1/notifications/received/*/private`,
            `${PREFIX}/GET/v1/notifications/received/delegated`,
          ],
        });
      });

      it("should deny to PG the PF-only static route covered by its wildcard", () => {
        expect(overlapping.PG.policyDocument.Statement[1].Resource).to.deep.equal([
          `${PREFIX}/GET/v1/notifications/received/*/private`,
          `${PREFIX}/GET/v1/notifications/received/check-tpp`,
        ]);
      });

      it("should deny ANY routes only for the methods they serve", () => {
        const result = buildPolicies(
          {
            paths: {
              "/v1/items/{id}": { get: { "x-pn-allowed-cx-types": ["PF"] } },
              "/v1/items/proxy": { [ANY]: { "x-pn-allowed-cx-types": ["PA"] }, get: { "x-pn-allowed-cx-types": ["PF"] } },
            },
          },
          ["PF", "PA"]
        );

        expect(result.PF.policyDocument.Statement).to.have.lengthOf(1);
        expect(result.PA.policyDocument.Statement[1].Resource).to.deep.equal([`${PREFIX}/GET/v1/items/proxy`]);
      });

      it("should throw when the deny would also block an allowed route", () => {
        const doc = {
          paths: {
            "/v1/items/{id}": { get: { "x-pn-allowed-cx-types": ["PF"] } },
            "/v1/items/{id}/files": { get: { "x-pn-allowed-cx-types": ["PA"] } },
            "/v1/items/{id}/{other}/files": { get: { "x-pn-allowed-cx-types": ["PF"] } },
          },
        };

        expect(() => buildPolicies(doc, ["PF", "PA"])).to.throw(
          "Cannot deny GET /v1/items/{id}/files to cx_type PF without also denying GET /v1/items/{id}/{other}/files"
        );
      });

      it("should deny only the routes actually covered by nested wildcards, ANY routes and prefix-sharing paths", () => {
        const result = buildPolicies(
          {
            paths: {
              "/v1/a/{x}/b/{y}": { get: { "x-pn-allowed-cx-types": ["PF"] }, post: {} },
              "/v1/a/{x}/b/{y}/c": { get: { "x-pn-allowed-cx-types": ["PG"] } },
              "/v1/a/static/b/c": { get: { "x-pn-allowed-cx-types": ["PG"] } },
              "/v1/a/static/b/d": { get: { "x-pn-allowed-cx-types": ["PF", "PG"] } },
              "/v1/a/{x}": { post: { "x-pn-allowed-cx-types": ["PG"] } },
              "/v1/p/{id}": { [ANY]: { "x-pn-allowed-cx-types": ["PF"] } },
              "/v1/p/static": { get: { "x-pn-allowed-cx-types": ["PF"] }, delete: { "x-pn-allowed-cx-types": ["PG"] } },
              "/v1/files/{name}": { get: { "x-pn-allowed-cx-types": ["PF"] } },
              "/v1/files-archive": { get: { "x-pn-allowed-cx-types": ["PG"] } },
            },
          },
          ["PF", "PG"]
        );

        expect(result.PF.policyDocument.Statement[1].Resource).to.deep.equal([
          `${PREFIX}/DELETE/v1/p/static`,
          `${PREFIX}/GET/v1/a/*/b/*/c`,
          `${PREFIX}/GET/v1/a/static/b/c`,
        ]);
        expect(result.PG.policyDocument.Statement[1].Resource).to.deep.equal([`${PREFIX}/POST/v1/a/*/b/*`]);
      });

      it("should deny every route below a path param right after the version", () => {
        const result = buildPolicies(
          {
            paths: {
              "/v1/{resource}": { get: { "x-pn-allowed-cx-types": ["PF"] } },
              "/v1/admin/users": { get: { "x-pn-allowed-cx-types": ["PA"] } },
              "/v1/admin/{id}/roles/{role}": { get: { "x-pn-allowed-cx-types": ["PA"] } },
              "/v2/admin/users": { get: { "x-pn-allowed-cx-types": ["PA"] } },
            },
          },
          ["PF", "PA"]
        );

        expect(result.PF.policyDocument.Statement[1].Resource).to.deep.equal([
          `${PREFIX}/GET/v1/admin/*/roles/*`,
          `${PREFIX}/GET/v1/admin/users`,
        ]);

        // Caso ipotetico, oggi non presente nelle API: il Deny di /v1/admin/* bloccherebbe anche /v1/admin/me,
        // consentita a PF, quindi la generazione fallisce
        const conflicting = {
          paths: {
            "/v1/{resource}": { get: { "x-pn-allowed-cx-types": ["PF"] } },
            "/v1/admin/{id}": { get: { "x-pn-allowed-cx-types": ["PA"] } },
            "/v1/admin/me": { get: { "x-pn-allowed-cx-types": ["PF"] } },
          },
        };
        expect(() => buildPolicies(conflicting, ["PF", "PA"])).to.throw(
          "Cannot deny GET /v1/admin/{id} to cx_type PF without also denying GET /v1/admin/me"
        );
      });
    });

    it("should throw on unknown cx_type", () => {
      const doc = { paths: { "/v1/foo": { get: { "x-pn-allowed-cx-types": ["XX"] } } } };

      expect(() => buildPolicies(doc, ["PF"])).to.throw('Unknown cx_type "XX" on GET /v1/foo');
    });
  });
});
