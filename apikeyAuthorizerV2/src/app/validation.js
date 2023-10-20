const jsonwebtoken = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

const {
  AudienceValidationException,
  ValidationException,
} = require("./exceptions.js");
// for testing purpose, we mustn't destructure the import; stub doesn't mock destructured object
const jwksCache = require("./jwksCache.js");
const retrieverPdndJwks = require("./retrieverPdndJwks.js");

const validation = async (jwtToken) => {
  if (jwtToken) {
    const decodedToken = await jwtValidator(jwtToken);
    console.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
};

const jwtValidator = async (jwtToken) => {
  const token = jsonwebtoken.decode(jwtToken, { complete: true });
  const keyId = token.header.kid;
  const tokenHeader = token.header;
  validateTokenHeader(tokenHeader);
  const issuer = token.payload.iss;
  validateTokenIssuer(issuer);
  const publicKey = await getDecodedPublicKey(keyId);
  validateTokenAudience(token.payload.aud);
  try {
    jsonwebtoken.verify(jwtToken, publicKey, {
      issuer: process.env.PDND_ISSUER,
      audience: process.env.PDND_AUDIENCE,
    });
  } catch (err) {
    throw new ValidationException(err.message);
  }
  console.debug("token payload", token.payload);
  console.log("success!");
  return token.payload;
};

async function getDecodedPublicKey(keyId) {
  let publicKey;
  if (jwksCache.isCacheActive()) {
    publicKey = await findPublicKeyUsingCache(keyId);
  } else {
    publicKey = await findPublicKeyWithoutCache(keyId);
  }
  return publicKey;
}

async function findPublicKeyUsingCache(keyId) {
  console.log("Using cache");
  const cachedJwks = await jwksCache.get();
  return getKeyFromJwks(cachedJwks, keyId);
}

async function findPublicKeyWithoutCache(keyId) {
  console.debug("Retrieving public key from PDND");
  const jwks = await retrieverPdndJwks.getJwks(process.env.PDND_ISSUER);
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

function validateTokenHeader(tokenHeader) {
  const tokenType = tokenHeader.typ;
  if (tokenType != "at+jwt") {
    console.warn("Validation error: Invalid token Type");
    throw new ValidationException("Invalid token Type");
  }
}

function validateTokenIssuer(issuer) {
  if (issuer != process.env.PDND_ISSUER) {
    console.warn("Validation error: Invalid token Issuer");
    throw new ValidationException("Invalid token Issuer");
  }
}

function validateTokenAudience(aud) {
  console.log("Validating audience: " + aud);
  if (aud != process.env.PDND_AUDIENCE) {
    console.warn("Validation error: Invalid token Audience");
    throw new AudienceValidationException("Invalid token Audience");
  }
}

module.exports = { validation };
