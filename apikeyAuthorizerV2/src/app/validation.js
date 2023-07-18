const jsonwebtoken = require("jsonwebtoken");
const retrieverPdndJwks = require("./retrieverPdndJwks.js");
const {
  ValidationException,
  AudienceValidationException,
} = require("./exceptions.js");
const jwkToPem = require("jwk-to-pem");
const jwksCache = require("./jwksCache.js");

module.exports = {
  async validation(jwtToken) {
    if (jwtToken) {
      let decodedToken = await jwtValidator(jwtToken);
      console.info("token is valid");
      return decodedToken;
    } else {
      throw new ValidationException("token is not valid");
    }
  },
};

async function jwtValidator(jwtToken) {
  const token = jsonwebtoken.decode(jwtToken, { complete: true });
  let keyId = token.header.kid;
  let tokenHeader = token.header;
  validateTokenHeader(tokenHeader);
  let issuer = token.payload.iss;
  validateTokenIssuer(issuer);
  let publicKey = await getDecodedPublicKey(keyId);
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
}

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
  let cachedJwks = await jwksCache.get();
  return getKeyFromJwks(cachedJwks, keyId);
}

async function findPublicKeyWithoutCache(keyId) {
  console.debug("Retrieving public key from PDND");
  let jwks = await retrieverPdndJwks.getJwks(process.env.PDND_ISSUER);
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

function validateTokenHeader(tokenHeader) {
  let tokenType = tokenHeader.typ;
  if (tokenType != "at+jwt") {
    console.info("Validation error: Invalid token Type");
    throw new ValidationException("Invalid token Type");
  }
}

function validateTokenIssuer(issuer) {
  if (issuer != process.env.PDND_ISSUER) {
    console.info("Validation error: Invalid token Issuer");
    throw new ValidationException("Invalid token Issuer");
  }
}

function validateTokenAudience(aud) {
  console.log("Validating audience: " + aud);
  if (aud != process.env.PDND_AUDIENCE) {
    console.info("Validation error: Invalid token Audience");
    throw new AudienceValidationException("Invalid token Audience");
  }
}
