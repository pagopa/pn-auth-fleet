// import jwkToPem from "jwk-to-pem";
// import { ValidationException } from "../exception/validationException";
// import { get, isCacheActive } from "./Jwks/JwksCache";

// export async function getPublicKey(issuer: string, kid: string) {
//   let publicKey;

//   if (isCacheActive) {
//     publicKey = await findPublicKeyUsingCache(kid, issuer);
//   } else {
//     publicKey = await findPublicKeyWithoutCache(kid, issuer);
//   }

//   return publicKey;
// }

// async function findPublicKeyUsingCache(keyId: string, issuer: string) {
//   console.log("Using cache");
//   const cachedJwks = await get(issuer);
//   return getKeyFromJwks(cachedJwks, keyId);
// }

// async function findPublicKeyWithoutCache(keyId: string, issuer: string) {
//   console.debug("Retrieving public key without cache");
//   const jwks = await retrieverJwks.getJwks(issuer);
//   return getKeyFromJwks(jwks, keyId);
// }

// function getKeyFromJwks(jwks: string, keyId: string) {
//   const publicKey = findKey(jwks, keyId);
//   const keyInPemFormat = jwkToPem(publicKey);

//   return keyInPemFormat;
// }

// function findKey(jwks: string, keyId: string) {
//   for (let key of jwks.keys) {
//     if (key.kid === keyId) {
//       console.debug("Found key", key.kid);
//       return key;
//     }
//   }

//   throw new ValidationException("Public key not found");
// }
