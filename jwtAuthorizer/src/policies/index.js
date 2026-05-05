const supportPolicy = require("./supportPolicy.json");
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

const buildSupportPolicy = (params) => buildPolicy(supportPolicy, params);

/** L'api di logout è una lambda con il suo gateway, non fa parte del gateway del BFF */
const buildLogoutPolicy = (params) => buildPolicy(logoutPolicy, params);

module.exports = {
  buildSupportPolicy,
  buildLogoutPolicy,
  denyAllPolicy,
};
