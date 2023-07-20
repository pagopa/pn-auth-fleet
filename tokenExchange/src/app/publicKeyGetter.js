const jwkToPem = require("jwk-to-pem");
const retrieverJwks = require("./retrieverJwks.js");
const jwksCache = require("./jwksCache.js");
const ValidationException = require("./exception/validationException.js");

module.exports = {
  async getPublicKey(issuer, kid) {
    let publicKey;
    if (jwksCache.isCacheActive()) {
      publicKey = await findPublicKeyUsingCache(kid, issuer);
    } else {
      publicKey = await findPublicKeyWithoutCache(kid, issuer);
    }
    return publicKey;
  },
};

async function findPublicKeyUsingCache(keyId, issuer) {
  console.log("Using cache");
  let cachedJwks = await jwksCache.get(issuer);
  return getKeyFromJwks(cachedJwks, keyId);
}

async function findPublicKeyWithoutCache(keyId, issuer) {
  console.debug("Retrieving public key without cache");
  let jwks = await retrieverJwks.getJwks(issuer);
  return getKeyFromJwks(jwks, keyId);
}

function getKeyFromJwks(jwks, keyId) {
  let publicKey = findKey(jwks, keyId);
  let keyInPemFormat = jwkToPem(publicKey);
  return keyInPemFormat;
}

function findKey(jwks, keyId) {
  for (let key of jwks.keys) {
    if (key.kid === keyId) {
      console.debug("Found key", key.kid);
      return key;
    }
  }

  throw ValidationException("Public key not found");
}
