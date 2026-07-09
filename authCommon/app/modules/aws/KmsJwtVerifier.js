const { GetPublicKeyCommand, KMS } = require("@aws-sdk/client-kms");
const jsonwebtoken = require("jsonwebtoken");

const ValidationException = require("../exception/ValidationException");

const kms = new KMS();
const cachedPublicKeyMap = new Map();

/**
 * Verify a JWT: resolve the signing public key from its `kid` via KMS (cached)
 * and check the signature. Returns the decoded payload.
 *
 * @param {Object} params
 * @param {string} params.jwtToken - the JWT to verify
 * @param {number} params.cacheTTL - public-key cache TTL in seconds
 * @param {boolean} [params.debug=false] - when true, log every step; otherwise stay silent
 */
async function validation({ jwtToken, cacheTTL, debug = false }) {
  if (jwtToken) {
    const decodedToken = await jwtValidator(jwtToken, cacheTTL, debug);
    if (debug) console.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
}

async function jwtValidator(jwtToken, cacheTTL, debug) {
  const token = decodeToken(jwtToken);

  if (debug) console.log("token ", token);
  const keyId = token.header.kid;
  if (debug) console.debug("header keyId ", keyId);
  let decodedPublicKey;
  const cachedPublicKey = searchInCache(keyId);
  if (cachedPublicKey) {
    if (debug) console.log("Using cached public key");
    decodedPublicKey = cachedPublicKey;
  } else {
    const encodedPublicKey = await retrievePublicKey(keyId, debug);
    decodedPublicKey = Buffer.from(encodedPublicKey.PublicKey, "binary").toString("base64");
    if (debug) console.debug("decodedPublicKey", decodedPublicKey);
    setCachedData(keyId, decodedPublicKey, cacheTTL, debug);
  }
  try {
    const publicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + decodedPublicKey + "\n-----END PUBLIC KEY-----";
    if (debug) console.debug("publicKeyPem", publicKeyPem);
    jsonwebtoken.verify(jwtToken, publicKeyPem);
  } catch (err) {
    if (debug) console.warn("Validation error ", err);
    throw new ValidationException(JSON.stringify(err));
  }
  if (debug) console.log("success!");
  return token.payload;
}

function setCachedData(keyId, val, cacheTTL, debug) {
  if (debug) console.debug("Set cached public key");
  cachedPublicKeyMap.set(keyId, {
    expiresOn: Date.now() + cacheTTL * 1000,
    value: val,
  });
}

async function retrievePublicKey(keyId, debug) {
  if (debug) console.debug("Retrieving public key from KMS");
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
