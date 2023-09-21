import jsonwebtoken from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import {
  AudienceValidationException,
  ValidationException,
} from "./exceptions.js";
import { get, isCacheActive } from "./jwksCache.js";
import { getJwks } from "./retrieverPdndJwks.js";

const validation = async (jwtToken) => {
  if (jwtToken) {
    let decodedToken = await jwtValidator(jwtToken);
    console.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
};

const jwtValidator = async (jwtToken) => {
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
};

async function getDecodedPublicKey(keyId) {
  let publicKey;
  if (isCacheActive()) {
    publicKey = await findPublicKeyUsingCache(keyId);
  } else {
    publicKey = await findPublicKeyWithoutCache(keyId);
  }
  return publicKey;
}

async function findPublicKeyUsingCache(keyId) {
  console.log("Using cache");
  let cachedJwks = await get();
  return getKeyFromJwks(cachedJwks, keyId);
}

async function findPublicKeyWithoutCache(keyId) {
  console.debug("Retrieving public key from PDND");
  let jwks = await getJwks(process.env.PDND_ISSUER);
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

export { validation };
