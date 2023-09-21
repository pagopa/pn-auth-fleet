import { GetPublicKeyCommand, KMS } from "@aws-sdk/client-kms";
import jsonwebtoken from "jsonwebtoken";
import { ValidationException } from "./exception/validationException.js";

const kms = new KMS();
let cachedPublicKeyMap = new Map();

const validation = async (jwtToken) => {
  if (jwtToken) {
    let decodedToken = await jwtValidator(jwtToken);
    console.info("token is valid");
    return decodedToken;
  } else {
    throw new ValidationException("token is not valid");
  }
};

async function jwtValidator(jwtToken) {
  const token = jsonwebtoken.decode(jwtToken, { complete: true });
  console.log("token ", token);
  let keyId = token.header.kid;
  console.debug("header keyId ", keyId);
  let decodedPublicKey;
  let cachedPublicKey = searchInCache(keyId);
  if (cachedPublicKey) {
    console.log("Using cached public key");
    decodedPublicKey = cachedPublicKey;
  } else {
    let encodedPublicKey = await retrievePublicKey(keyId);
    decodedPublicKey = encodedPublicKey.PublicKey.toString("base64");
    console.debug("decodedPublicKey", decodedPublicKey);
    setCachedData(keyId, decodedPublicKey);
  }
  try {
    let publicKeyPem =
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

const setCachedData = (keyId, val) => {
  console.debug("Set cached public key");
  cachedPublicKeyMap.set(keyId, {
    expiresOn: Date.now() + process.env.CACHE_TTL * 1000,
    value: val,
  });
};

async function retrievePublicKey(keyId) {
  console.debug("Retrieving public key from KMS");
  const command = new GetPublicKeyCommand({ KeyId: keyId });
  let res = await kms.send(command);
  return res;
}

function searchInCache(keyId) {
  let result = cachedPublicKeyMap.get(keyId);
  if (result && result.expiresOn > Date.now()) {
    return result.value;
  } else {
    return null;
  }
}

export { validation };
