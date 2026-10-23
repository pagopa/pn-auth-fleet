/** Le policy per cx_type sono generate in postinstall da scripts/generatePolicies.js */
const cxTypePolicies = {
  PF: require("./generated/pfPolicy.json"),
  PA: require("./generated/paPolicy.json"),
  PG: require("./generated/pgPolicy.json"),
  BS: require("./generated/bsPolicy.json"),
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
