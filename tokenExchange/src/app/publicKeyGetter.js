const jwkToPem = require("jwk-to-pem");

const ValidationException = require("./exception/validationException.js");
const { get, isCacheActive } = require("./jwksCache.js");
const { getJwks } = require("./retrieverJwks.js");

async function getPublicKey(issuer, kid) {
  let publicKey;
  if (isCacheActive()) {
    publicKey = await findPublicKeyUsingCache(kid, issuer);
  } else {
    publicKey = await findPublicKeyWithoutCache(kid, issuer);
  }
  return publicKey;
}

async function findPublicKeyUsingCache(keyId, issuer) {
  console.log("Using cache");
  const cachedJwks = await get(issuer);
  return getKeyFromJwks(cachedJwks, keyId);
}

async function findPublicKeyWithoutCache(keyId, issuer) {
  console.debug("Retrieving public key without cache");
  const jwks = await getJwks(issuer);
  return getKeyFromJwks(jwks, keyId);
}

function getKeyFromJwks(jwks, keyId) {
  const publicKey = findKey(jwks, keyId);
  const keyInPemFormat = jwkToPem(publicKey);
  return keyInPemFormat;
}

function findKey(jwks, keyId) {
  for (let key of jwks.keys) {
    if (key.kid === keyId) {
      console.debug("Found key", key.kid);
      return key;
    }
  }

  throw new ValidationException("Public key not found");
}

module.exports = { getPublicKey };
