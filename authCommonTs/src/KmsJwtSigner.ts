import { DescribeKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { captureAWSv3Client } from "aws-xray-sdk-core";
import base64url from "base64url";

const kms = captureAWSv3Client(new KMS());

interface SignKmsJwtProps {
  // The JWT payload to sign. Callers own its shape; this module only serializes it.
  payload: Record<string, unknown>;
  // KMS key alias used for signing (resolved to a keyId here).
  keyAlias: string;
}

interface JwtParts {
  header: string;
  payload: string;
}

/**
 * Sign a JWT payload with AWS KMS (RS256) and return the full compact JWT.
 *
 * The KMS key is identified by alias; this function resolves it to a keyId,
 * builds the base64url header/payload, signs, and assembles the token.
 *
 * NOTE: this shared helper never reads env variables; callers pass `keyAlias`.
 */
export const signKmsJwt = async ({ payload, keyAlias }: SignKmsJwtProps): Promise<string> => {
  const keyId = await getKeyIdFromAlias(keyAlias);
  const jwtParts = createJwtParts(payload, keyId);
  return signJwt(jwtParts, keyId);
};

/**
 * Resolves the KMS key ID associated with a given alias.
 */
const getKeyIdFromAlias = async (alias: string): Promise<string> => {
  const command = new DescribeKeyCommand({ KeyId: alias });
  const result = await kms.send(command);

  const keyId = result.KeyMetadata?.KeyId;
  if (!keyId) {
    throw new Error("Unable to resolve KMS keyId for alias");
  }

  return keyId;
};

/**
 * Generates the base64url-encoded JWT header and payload components.
 */
const createJwtParts = (payload: Record<string, unknown>, keyId: string): JwtParts => {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: keyId,
  };

  return {
    header: base64url(JSON.stringify(header)),
    payload: base64url(JSON.stringify(payload)),
  };
};

/**
 * Signs a message using AWS KMS.
 */
const signWithKms = async (message: Buffer, keyId: string): Promise<Uint8Array> => {
  const command = new SignCommand({
    Message: message,
    KeyId: keyId,
    SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
    MessageType: "RAW",
  });

  const result = await kms.send(command);

  if (!result.Signature) {
    throw new Error("KMS returned an empty signature");
  }
  return result.Signature;
};

/**
 * Signs the JWT header and payload and returns a full JWT string.
 */
const signJwt = async (token: JwtParts, keyId: string): Promise<string> => {
  const message = Buffer.from(`${token.header}.${token.payload}`);
  const signature = await signWithKms(message, keyId);

  const signatureBase64Url = base64url.encode(Buffer.from(signature));

  return `${token.header}.${token.payload}.${signatureBase64Url}`;
};
