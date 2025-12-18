// import jwkToPem from "jwk-to-pem";
// import { ValidationException } from "../exception/validationException";
// import { get, isCacheActive } from "./Jwks/JwksCache";
// import { getJwks } from "./Jwks/JwksRetriever";
// import { JWKS } from "../../models/Jwks";

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
//   const jwks = await getJwks(issuer);
//   return getKeyFromJwks(jwks, keyId);
// }

// function getKeyFromJwks(jwks: JWKS, keyId: string) {
//   const publicKey = findKey(jwks, keyId);
//   const keyInPemFormat = jwkToPem(publicKey);

//   return keyInPemFormat;
// }

// function findKey(jwks: JWKS, keyId: string) {
//   for (let key of jwks.keys) {
//     if (key.kid === keyId) {
//       console.debug("Found key", key.kid);
//       return key;
//     }
//   }

//   throw new ValidationException("Public key not found");
// }
