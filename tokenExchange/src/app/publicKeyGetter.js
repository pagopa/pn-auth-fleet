import jwkToPem from "jwk-to-pem";
import { ValidationException } from "./exception/validationException.js";
import { get, isCacheActive } from "./jwksCache.js";
import { getJwks } from "./retrieverJwks.js";

const getPublicKey = async (issuer, kid) => {
  let publicKey;
  if (isCacheActive()) {
    publicKey = await findPublicKeyUsingCache(kid, issuer);
  } else {
    publicKey = await findPublicKeyWithoutCache(kid, issuer);
  }
  return publicKey;
};

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

  throw ValidationException("Public key not found");
}

export { getPublicKey };
