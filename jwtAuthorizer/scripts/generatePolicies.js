/**
 * Genera le policy per cx_type (pfPolicy.json, paPolicy.json, ...) a partire dall'OpenAPI del BFF,
 * leggendo l'extension x-pn-allowed-cx-types di ogni operazione.
 * Le operazioni senza extension non finiscono in nessuna policy (default deny).
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const config = require("./config.json");

const CX_TYPES_EXTENSION = "x-pn-allowed-cx-types";
const RESOURCE_PREFIX = "arn:aws:execute-api:{region}:{awsAccountId}:{restApiId}/{stage}";
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head"];
const ANY_METHOD = "x-amazon-apigateway-any-method";

// In una Resource IAM "*" corrisponde a qualunque sequenza di caratteri, "/" compreso
const resourcePath = (apiPath) => apiPath.replace(/\{[^}]+\}/g, "*");
const pathToResource = (method, apiPath) => `${RESOURCE_PREFIX}/${method}${resourcePath(apiPath)}`;
const matchesResourcePath = (pattern, value) =>
  new RegExp(
    "^" + pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$"
  ).test(value);
// Un path concreto servito dalla rotta: il valore del path param non coincide con nessun segmento
// statico, perché API Gateway instrada quei path verso la rotta statica
const concretePath = (apiPath) => apiPath.replace(/\{[^}]+\}/g, "\u0000");
// La Resource di resourceRoute copre richieste servite da servedRoute? Una rotta ANY serve solo i metodi
// che non hanno un'operazione esplicita sullo stesso path
const covers = (resourceRoute, servedRoute, explicitMethodsByPath) =>
  (resourceRoute.method === "*" ||
    (servedRoute.method === "*"
      ? !explicitMethodsByPath.get(servedRoute.apiPath).has(resourceRoute.method)
      : resourceRoute.method === servedRoute.method)) &&
  matchesResourcePath(resourcePath(resourceRoute.apiPath), concretePath(servedRoute.apiPath));
const describe = (route) => `${route.method} ${route.apiPath}`;

const statement = (effect, routes) => ({
  Action: "execute-api:Invoke",
  Effect: effect,
  Resource: routes.map((route) => pathToResource(route.method, route.apiPath)).sort(),
});

const toPolicy = (statements) => ({
  principalId: "user",
  policyDocument: { Version: "2012-10-17", Statement: statements },
  context: {},
});

/**
 * Le wildcard dei path param coprono anche le rotte con lo stesso prefisso (es. GET /received/* copre
 * GET /received/delegated): le rotte non consentite al cx_type ma coperte da una Resource consentita
 * vengono negate esplicitamente, perché in IAM il Deny prevale sull'Allow.
 */
const buildCxTypePolicy = (cxType, routes, explicitMethodsByPath) => {
  const allowed = routes.filter((route) => route.allowedCxTypes.includes(cxType));
  if (allowed.length === 0) {
    console.warn(`No operation allowed for cx_type ${cxType}: generating deny policy`);
    return toPolicy([{ Action: "execute-api:Invoke", Effect: "Deny", Resource: `${RESOURCE_PREFIX}/*` }]);
  }
  const denied = routes.filter(
    (route) =>
      !route.allowedCxTypes.includes(cxType) &&
      allowed.some((allowedRoute) => covers(allowedRoute, route, explicitMethodsByPath))
  );
  for (const deniedRoute of denied) {
    const blocked = allowed.find((allowedRoute) => covers(deniedRoute, allowedRoute, explicitMethodsByPath));
    if (blocked) {
      throw new Error(
        `Cannot deny ${describe(deniedRoute)} to cx_type ${cxType} without also denying ${describe(blocked)}`
      );
    }
  }
  return toPolicy(
    denied.length > 0 ? [statement("Allow", allowed), statement("Deny", denied)] : [statement("Allow", allowed)]
  );
};

const buildPolicies = (openapiDoc, cxTypes) => {
  const routes = [];
  const explicitMethodsByPath = new Map();

  for (const [apiPath, pathItem] of Object.entries(openapiDoc.paths ?? {})) {
    explicitMethodsByPath.set(apiPath, new Set());
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
        if (!cxTypes.includes(cxType)) {
          throw new Error(`Unknown cx_type "${cxType}" on ${key.toUpperCase()} ${apiPath}`);
        }
      }
      routes.push({ method, apiPath, allowedCxTypes });
      explicitMethodsByPath.get(apiPath).add(method);
    }
  }

  return Object.fromEntries(
    cxTypes.map((cxType) => [cxType, buildCxTypePolicy(cxType, routes, explicitMethodsByPath)])
  );
};

const main = async () => {
  const rootDir = path.join(__dirname, "..");

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
    const resources = policy.policyDocument.Statement.find((stmt) => stmt.Effect === "Allow")?.Resource;
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
