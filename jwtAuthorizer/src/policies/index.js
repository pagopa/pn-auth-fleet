const supportPolicy = require("./supportPolicy.json");
const allowAllPolicy = require("./allowAllPolicy.json");
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

const buildAllowAllPolicy = (params) => buildPolicy(allowAllPolicy, params);

module.exports = {
  buildSupportPolicy,
  buildAllowAllPolicy,
  denyAllPolicy,
};
