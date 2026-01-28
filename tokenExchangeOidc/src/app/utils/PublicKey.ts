import jwkToPem from "jwk-to-pem";
import { JWKS } from "../../models/Jwks";
import { ValidationException } from "../exception/validationException";
import { get, isCacheActive } from "./Jwks/JwksCache";
import { getJwks } from "./Jwks/JwksRetriever";

export async function getPublicKeys(issuer: string, kid?: string) {
  let publicKeys: Array<string>;

  if (isCacheActive) {
    publicKeys = await findPublicKeysUsingCache(issuer, kid);
  } else {
    publicKeys = await findPublicKeysWithoutCache(kid);
  }

  return publicKeys;
}

async function findPublicKeysUsingCache(issuer: string, kid?: string) {
  console.log("Using cache");
  const cachedJwks = await get(issuer);
  if (!cachedJwks) {
    throw new ValidationException("Public key not found in cache");
  }
  return getKeysFromJwks(cachedJwks, kid);
}

async function findPublicKeysWithoutCache(kid?: string) {
  console.debug("Retrieving public key without cache");
  const jwks = await getJwks();
  return getKeysFromJwks(jwks, kid);
}

function getKeysFromJwks(jwks: JWKS, kid?: string) {
  if (!jwks.keys || jwks.keys.length === 0) {
    throw new ValidationException("No keys found in JWKS");
  }

  // If kid is provided, find the public key with that kid
  if (kid) {
    const key = jwks.keys.find((key) => key.kid === kid);
    if (!key) {
      throw new ValidationException(`Key with kid '${kid}' not found in JWKS`);
    }
    return [jwkToPem(key)];
  }

  // If kid is undefined, return all keys
  return jwks.keys.map((key) => jwkToPem(key));
}
