const { GetPublicKeyCommand, KMS } = require("@aws-sdk/client-kms");
const jsonwebtoken = require("jsonwebtoken");

const ValidationException = require("./exception/validationException.js");

const kms = new KMS();
const cachedPublicKeyMap = new Map();

async function validation(jwtToken) {
  if (jwtToken) {
    const decodedToken = await jwtValidator(jwtToken);
    console.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
}

async function jwtValidator(jwtToken) {
  const token = jsonwebtoken.decode(jwtToken, { complete: true });
  console.log("token ", token);
  const keyId = token.header.kid;
  console.debug("header keyId ", keyId);
  let decodedPublicKey;
  const cachedPublicKey = searchInCache(keyId);
  if (cachedPublicKey) {
    console.log("Using cached public key");
    decodedPublicKey = cachedPublicKey;
  } else {
    const encodedPublicKey = await retrievePublicKey(keyId);
    decodedPublicKey = Buffer.from(
      encodedPublicKey.PublicKey,
      "binary"
    ).toString("base64");
    console.debug("decodedPublicKey", decodedPublicKey);
    setCachedData(keyId, decodedPublicKey);
  }
  try {
    const publicKeyPem =
      "-----BEGIN PUBLIC KEY-----\n" +
      decodedPublicKey +
      "\n-----END PUBLIC KEY-----";
    console.debug("publicKeyPem", publicKeyPem);
    jsonwebtoken.verify(jwtToken, publicKeyPem);
  } catch (err) {
    console.warn("Validation error ", err);
    throw new ValidationException(err.message);
  }
  console.log("success!");
  return token.payload;
}

function setCachedData(keyId, val) {
  console.debug("Set cached public key");
  cachedPublicKeyMap.set(keyId, {
    expiresOn: Date.now() + process.env.CACHE_TTL * 1000,
    value: val,
  });
}

async function retrievePublicKey(keyId) {
  console.debug("Retrieving public key from KMS");
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

module.exports = { validation };
