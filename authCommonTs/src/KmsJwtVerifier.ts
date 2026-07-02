import { GetPublicKeyCommand, KMS } from "@aws-sdk/client-kms";
import { captureAWSv3Client } from "aws-xray-sdk-core";
import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { ValidationException } from "./ValidationException";

const kms = captureAWSv3Client(new KMS());

// Module-level cache of KMS public keys (base64 DER), keyed by kid. Persists
// across warm Lambda invocations, mirroring jwtAuthorizer's cache.
interface CachedPublicKey {
  value: string;
  expiresOn: number;
}
const cachedPublicKeyMap = new Map<string, CachedPublicKey>();

export const clearKmsPublicKeyCache = () => {
  cachedPublicKeyMap.clear();
};

interface VerifyKmsJwtProps {
  // The compact JWT to verify.
  jwt: string;
  // Cache TTL (seconds) for the resolved KMS public key. 0 disables caching.
  cacheTTL: number;
}

/**
 * Verify a JWT that was signed with a KMS key (RS256), the way jwtAuthorizer
 * does: the signing key is resolved from the token's `kid` header via
 * kms:GetPublicKey, cached, and the signature + `exp` are validated.
 *
 * Only signature and expiry are checked (no iss/aud), matching jwtAuthorizer.
 *
 * NOTE: this shared helper never reads env variables; callers pass `cacheTTL`.
 *
 * @returns the decoded JWT payload
 */
export const verifyKmsJwt = async <T extends JwtPayload = JwtPayload>({
  jwt,
  cacheTTL,
}: VerifyKmsJwtProps): Promise<T> => {
  const decoded = jsonwebtoken.decode(jwt, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new ValidationException("Unable to decode input JWT string");
  }

  const kid = decoded.header.kid;
  if (!kid) {
    throw new ValidationException("JWT header is missing kid");
  }

  const publicKeyPem = await resolvePublicKeyPem(kid, cacheTTL);

  try {
    jsonwebtoken.verify(jwt, publicKeyPem);
  } catch (err) {
    throw new ValidationException(JSON.stringify(err));
  }

  return decoded.payload as T;
};

/**
 * Resolves the PEM public key for a KMS key id, using the module-level cache.
 */
const resolvePublicKeyPem = async (kid: string, cacheTTL: number): Promise<string> => {
  const cached = cacheTTL > 0 ? searchInCache(kid) : undefined;
  const decodedPublicKey = cached ?? (await retrieveAndCachePublicKey(kid, cacheTTL));

  return `-----BEGIN PUBLIC KEY-----\n${decodedPublicKey}\n-----END PUBLIC KEY-----`;
};

const retrieveAndCachePublicKey = async (kid: string, cacheTTL: number): Promise<string> => {
  const command = new GetPublicKeyCommand({ KeyId: kid });
  const res = await kms.send(command);

  if (!res.PublicKey) {
    throw new ValidationException("KMS returned an empty public key");
  }

  const decodedPublicKey = Buffer.from(res.PublicKey).toString("base64");

  if (cacheTTL > 0) {
    cachedPublicKeyMap.set(kid, {
      value: decodedPublicKey,
      expiresOn: Date.now() + cacheTTL * 1000,
    });
  }

  return decodedPublicKey;
};

const searchInCache = (kid: string): string | undefined => {
  const result = cachedPublicKeyMap.get(kid);
  if (result && result.expiresOn > Date.now()) {
    return result.value;
  }
  return undefined;
};
