const { GetPublicKeyCommand, KMS } = require("@aws-sdk/client-kms");
const jsonwebtoken = require("jsonwebtoken");

const ValidationException = require("../exception/ValidationException");
const { maskString } = require("../utils/stringUtils");

const kms = new KMS();
const cachedPublicKeyMap = new Map();

const noop = () => {};

// Console-like logger. When debug is false every method is a no-op so the
// verifier stays completely silent; when true it forwards to console.
function createLogger(debug) {
  return {
    log: debug ? console.log.bind(console) : noop,
    info: debug ? console.info.bind(console) : noop,
    debug: debug ? console.debug.bind(console) : noop,
    warn: debug ? console.warn.bind(console) : noop,
  };
}

const SENSITIVE_FIELDS = new Set([
  "name",
  "given_name",
  "fiscal_number",
  "family_name",
  "fiscal_code",
  "fiscalCode",
  "givenName",
  "familyName",
  "fiscalNumber",
]);

const maskTokenPayload = (token) => ({
  ...token,
  payload: Object.fromEntries(
    Object.entries(token.payload).map(([key, value]) => [
      key,
      SENSITIVE_FIELDS.has(key) && typeof value === "string"
        ? maskString(value)
        : value,
    ]),
  ),
});

/**
 * Verify a JWT: resolve the signing public key from its `kid` via KMS (cached)
 * and check the signature. Returns the decoded payload.
 *
 * @param {string} jwtToken - the JWT to verify
 * @param {number} cacheTTL - public-key cache TTL in seconds
 * @param {boolean} [debug=false] - when true, log every step; otherwise stay silent
 */
async function validation(jwtToken, cacheTTL, debug = false) {
  const logger = createLogger(debug);
  if (jwtToken) {
    const decodedToken = await jwtValidator(jwtToken, cacheTTL, logger);
    logger.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
}

async function jwtValidator(jwtToken, cacheTTL, logger) {
  const token = decodeToken(jwtToken);

  logger.log("token ", maskTokenPayload(token));
  const keyId = token.header.kid;
  logger.debug("header keyId ", keyId);
  let decodedPublicKey;
  const cachedPublicKey = searchInCache(keyId);
  if (cachedPublicKey) {
    logger.log("Using cached public key");
    decodedPublicKey = cachedPublicKey;
  } else {
    const encodedPublicKey = await retrievePublicKey(keyId, logger);
    decodedPublicKey = Buffer.from(encodedPublicKey.PublicKey, "binary").toString("base64");
    logger.debug("decodedPublicKey", decodedPublicKey);
    setCachedData(keyId, decodedPublicKey, cacheTTL, logger);
  }
  try {
    const publicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + decodedPublicKey + "\n-----END PUBLIC KEY-----";
    logger.debug("publicKeyPem", publicKeyPem);
    jsonwebtoken.verify(jwtToken, publicKeyPem);
  } catch (err) {
    logger.warn("Validation error ", err);
    throw new ValidationException(JSON.stringify(err));
  }
  logger.log("success!");
  return token.payload;
}

function setCachedData(keyId, val, cacheTTL, logger) {
  logger.debug("Set cached public key");
  cachedPublicKeyMap.set(keyId, {
    expiresOn: Date.now() + cacheTTL * 1000,
    value: val,
  });
}

async function retrievePublicKey(keyId, logger) {
  logger.debug("Retrieving public key from KMS");
  const command = new GetPublicKeyCommand({ KeyId: keyId });
  const res = await kms.send(command);
  return res;
}

function searchInCache(keyId) {
  const result = cachedPublicKeyMap.get(keyId);
  if (result && result.expiresOn > Date.now()) {
    return result.value;
  } else {
    return null;
  }
}

/**
 * Decode a string representation of JWT token into a {@link jsonwebtoken.Jwt} object.
 * If input string is does not comply with JWT structure then throw {@link ValidationException} error.
 *
 * @param {string} jwtToken
 * @returns decoded token
 */
function decodeToken(jwtToken) {
  const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });

  if (!decodedToken) {
    throw new ValidationException("Unable to decode input JWT string");
  }

  return decodedToken;
}

module.exports = { validation };
