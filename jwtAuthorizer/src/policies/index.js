const path = require("path");

/**
 * Le policy per cx_type arrivano da pn-bff (docs/openapi/policies/generated): la pipeline di deploy
 * le copia in resource/policies/generated. POLICIES_DIR permette ai test di usare delle fixture.
 */
const policiesDir = path.resolve(
  process.env.POLICIES_DIR ?? path.join(__dirname, "../../resource/policies/generated")
);
const cxTypePolicies = {
  PF: require(path.join(policiesDir, "pfPolicy.json")),
  PA: require(path.join(policiesDir, "paPolicy.json")),
  PG: require(path.join(policiesDir, "pgPolicy.json")),
  BS: require(path.join(policiesDir, "bsPolicy.json")),
};
const logoutPolicy = require("./logoutPolicy.json");
const denyAllPolicy = require("./denyAllPolicy.json");

const buildPolicy = (template, { region, awsAccountId, restApiId, stage, contextAttrs }) => {
  const policy = structuredClone(template);

  const fillResource = (resource) =>
    resource
      .replace("{region}", region)
      .replace("{awsAccountId}", awsAccountId)
      .replace("{restApiId}", restApiId)
      .replace("{stage}", stage);

  for (const statement of policy.policyDocument.Statement) {
    if (Array.isArray(statement.Resource)) {
      statement.Resource = statement.Resource.map(fillResource);
    } else {
      statement.Resource = fillResource(statement.Resource);
    }
  }

  policy.context = contextAttrs;
  return policy;
};

const buildCxTypePolicy = (cxType, params) => {
  const template = cxTypePolicies[cxType];
  if (!template) {
    throw new Error(`No policy for cx_type ${cxType}`);
  }
  return buildPolicy(template, params);
};

/** L'api di logout è una lambda con il suo gateway, non fa parte del gateway del BFF */
const buildLogoutPolicy = (params) => buildPolicy(logoutPolicy, params);

module.exports = {
  buildCxTypePolicy,
  buildLogoutPolicy,
  denyAllPolicy,
};
