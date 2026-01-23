import jwkToPem from "jwk-to-pem";
import { JWKS } from "../../models/Jwks";
import { ValidationException } from "../exception/validationException";
import { get, isCacheActive } from "./Jwks/JwksCache";
import { getJwks } from "./Jwks/JwksRetriever";

export async function getPublicKeys(issuer: string) {
  let publicKeys: Array<string>;

  if (isCacheActive) {
    publicKeys = await findPublicKeysUsingCache(issuer);
  } else {
    publicKeys = await findPublicKeysWithoutCache();
  }

  return publicKeys;
}

async function findPublicKeysUsingCache(issuer: string) {
  console.log("Using cache");
  const cachedJwks = await get(issuer);
  if (!cachedJwks) {
    throw new ValidationException("Public key not found in cache");
  }
  return getKeysFromJwks(cachedJwks);
}

async function findPublicKeysWithoutCache() {
  console.debug("Retrieving public key without cache");
  const jwks = await getJwks();
  return getKeysFromJwks(jwks);
}

function getKeysFromJwks(jwks: JWKS) {
  if (!jwks.keys || jwks.keys.length === 0) {
    throw new ValidationException("No keys found in JWKS");
  }

  return jwks.keys.map((key) => jwkToPem(key));
}
