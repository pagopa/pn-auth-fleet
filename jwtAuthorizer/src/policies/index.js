const supportPolicy = require("./supportPolicy.json");
const logoutPolicy = require("./logoutPolicy.json");
const denyAllPolicy = require("./denyAllPolicy.json");

const buildPolicy = (template, { region, awsAccountId, restApiId, stage, contextAttrs }) => {
  const policy = structuredClone(template);

  for (const statement of policy.policyDocument.Statement) {
    const resources = [statement.Resource].flat();
    statement.Resource = resources.map((resource) =>
      resource
        .replace("{region}", region)
        .replace("{awsAccountId}", awsAccountId)
        .replace("{restApiId}", restApiId)
        .replace("{stage}", stage),
    );
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
