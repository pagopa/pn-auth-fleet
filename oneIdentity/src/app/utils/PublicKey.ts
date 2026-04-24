import jwkToPem from "jwk-to-pem";
import { JWKS } from "../../models/Jwks";
import { ValidationException } from "../exception/validationException";
import { get, isCacheActive } from "./Jwks/JwksCache";
import { getJwks } from "./Jwks/JwksRetriever";

export async function getPublicKey(issuer: string, kid: string) {
  let publicKey: string;

  if (isCacheActive) {
    publicKey = await findPublicKeyUsingCache(issuer, kid);
  } else {
    publicKey = await findPublicKeyWithoutCache(kid);
  }

  return publicKey;
}

async function findPublicKeyUsingCache(issuer: string, kid: string) {
  console.log("Using cache");
  const cachedJwks = await get(issuer);
  if (!cachedJwks) {
    throw new ValidationException("Public key not found in cache");
  }
  return getKeyFromJwks(cachedJwks, kid);
}

async function findPublicKeyWithoutCache(kid: string) {
  console.debug("Retrieving public key without cache");
  const jwks = await getJwks();
  return getKeyFromJwks(jwks, kid);
}

function getKeyFromJwks(jwks: JWKS, kid: string) {
  if (!jwks.keys || jwks.keys.length === 0) {
    throw new ValidationException("No keys found in JWKS");
  }

  const jwk = jwks.keys.find((key) => key.kid === kid);

  if (!jwk) {
    throw new ValidationException(
      `Public key with kid ${kid} not found in JWKS`,
    );
  }

  return jwkToPem(jwk);
}
