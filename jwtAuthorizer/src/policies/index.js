const fs = require("fs");
const path = require("path");

/**
 * Le policy per cx_type arrivano da pn-bff (docs/openapi/policies/generated): la pipeline di deploy
 * copia l'intera cartella in resource/policies/generated. POLICIES_DIR permette ai test di usare delle fixture.
 * Ogni file <cxType>Policy.json viene caricato come policy del cx_type corrispondente (es. pfPolicy.json -> PF),
 * così un nuovo cx_type non richiede modifiche né qui né alla pipeline.
 */
const POLICY_FILE_SUFFIX = "Policy.json";
const policiesDir = path.resolve(
  process.env.POLICIES_DIR ?? path.join(__dirname, "../../resource/policies/generated")
);
const cxTypePolicies = Object.fromEntries(
  fs
    .readdirSync(policiesDir)
    .filter((file) => file.endsWith(POLICY_FILE_SUFFIX))
    .map((file) => [
      file.slice(0, -POLICY_FILE_SUFFIX.length).toUpperCase(),
      require(path.join(policiesDir, file)),
    ])
);
if (Object.keys(cxTypePolicies).length === 0) {
  throw new Error(`No cx_type policies found in ${policiesDir}`);
}
console.log("Loaded policies for cx_types:", Object.keys(cxTypePolicies));

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
