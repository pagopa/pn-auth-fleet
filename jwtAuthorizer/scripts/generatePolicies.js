/**
 * Genera le policy per cx_type (pfPolicy.json, paPolicy.json, ...) a partire dall'OpenAPI del BFF,
 * leggendo l'extension x-pn-allowed-cx-types di ogni operazione.
 * Le operazioni senza extension non finiscono in nessuna policy (default deny).
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const CX_TYPES_EXTENSION = "x-pn-allowed-cx-types";
const RESOURCE_PREFIX = "arn:aws:execute-api:{region}:{awsAccountId}:{restApiId}/{stage}";
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head"];
const ANY_METHOD = "x-amazon-apigateway-any-method";

const pathToResource = (method, apiPath) =>
  `${RESOURCE_PREFIX}/${method}${apiPath.replace(/\{[^}]+\}/g, "*")}`;

const toPolicy = (resources) => ({
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      resources.length > 0
        ? { Action: "execute-api:Invoke", Effect: "Allow", Resource: resources }
        : { Action: "execute-api:Invoke", Effect: "Deny", Resource: `${RESOURCE_PREFIX}/*` },
    ],
  },
  context: {},
});

const buildPolicies = (openapiDoc, cxTypes) => {
  const resourcesByCxType = Object.fromEntries(cxTypes.map((cxType) => [cxType, new Set()]));

  for (const [apiPath, pathItem] of Object.entries(openapiDoc.paths ?? {})) {
    for (const [key, operation] of Object.entries(pathItem)) {
      let method;
      if (HTTP_METHODS.includes(key)) {
        method = key.toUpperCase();
      } else if (key === ANY_METHOD) {
        method = "*";
      } else {
        continue;
      }

      const allowedCxTypes = operation[CX_TYPES_EXTENSION] ?? [];
      for (const cxType of allowedCxTypes) {
        if (!resourcesByCxType[cxType]) {
          throw new Error(`Unknown cx_type "${cxType}" on ${key.toUpperCase()} ${apiPath}`);
        }
        resourcesByCxType[cxType].add(pathToResource(method, apiPath));
      }
    }
  }

  return Object.fromEntries(
    Object.entries(resourcesByCxType).map(([cxType, resources]) => {
      if (resources.size === 0) {
        console.warn(`No operation allowed for cx_type ${cxType}: generating deny policy`);
      }
      return [cxType, toPolicy([...resources].sort())];
    })
  );
};

const main = async () => {
  const rootDir = path.join(__dirname, "..");
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

  const response = await fetch(config.openapiUrl);
  if (!response.ok) {
    throw new Error(`Unable to download ${config.openapiUrl}: HTTP ${response.status}`);
  }
  const openapiDoc = yaml.load(await response.text());

  const policies = buildPolicies(openapiDoc, config.cxTypes);

  const outputDir = path.join(rootDir, config.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [cxType, policy] of Object.entries(policies)) {
    const file = path.join(outputDir, `${cxType.toLowerCase()}Policy.json`);
    fs.writeFileSync(file, JSON.stringify(policy, null, 2) + "\n");
    const resources = policy.policyDocument.Statement[0].Resource;
    console.log(`Generated ${path.relative(rootDir, file)} (${Array.isArray(resources) ? resources.length : 0} resources)`);
  }
};

if (require.main === module) {
  main().catch((err) => {
    console.error("Error generating policies", err);
    process.exit(1);
  });
}

module.exports = { pathToResource, buildPolicies };
