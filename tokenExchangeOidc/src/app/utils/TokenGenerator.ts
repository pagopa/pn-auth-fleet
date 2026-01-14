import { DescribeKeyCommand, KMS, SignCommand } from "@aws-sdk/client-kms";
import { captureAWSv3Client } from "aws-xray-sdk-core";
import base64url from "base64url";
import { JwtParts, JwtPayload } from "../../models/Token";

const kms = captureAWSv3Client(new KMS());

interface CreateJwtPartsProps {
  payload: JwtPayload;
  keyId: string;
}

interface GenerateJwtPayloadProps {
  pairwise: string;
  state: string;
}

/**
 * Generate a Session Token
 *
 * @param payload - The Session Token JWT Payload
 */
export const generateSessionToken = async (
  payload: JwtPayload
): Promise<string> => {
  const keyAlias = process.env.KEY_ALIAS;
  if (!keyAlias) {
    throw new Error("KEY_ALIAS is not set");
  }

  const keyId = await getKeyIdFromAlias(keyAlias);
  const jwtParts = createJwtParts({ payload, keyId });
  const sessionToken = await signJwt(jwtParts, keyId);

  return sessionToken;
};

/**
 * Generate JWT payload
 *
 * @param pairwise - The pairwise from OI decoded token
 * @param state - The state from request body
 */
export const generateJwtPayload = ({
  pairwise,
  state,
}: GenerateJwtPayloadProps): JwtPayload => {
  if (!process.env.ISSUER) {
    throw new Error("ISSUER is not set");
  }

  if (!process.env.AUDIENCE) {
    throw new Error("AUDIENCE is not set");
  }

  const expDate = getExpDate();

  return {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expDate.getTime() / 1000),
    uid: pairwise,
    iss: process.env.ISSUER,
    aud: process.env.AUDIENCE,
    jti: state,
  };
};

/**
 * Retrieves the KMS key ID associated with a given alias
 *
 * @param keyAlias - KMS key alias
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
 * Generates the JWT header and payload components
 *
 * @param decodedToken - One Identity decoded token
 * @param keyId - KMS key ID used for signing
 */
const createJwtParts = ({ payload, keyId }: CreateJwtPartsProps) => {
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
 * Calculates the expiration date for the session token
 */
const getExpDate = () => {
  const secondsToAdd = process.env.TOKEN_TTL;
  if (!secondsToAdd) {
    throw new Error("TOKEN_TTL is not set");
  }
  const expDate = Date.now() + Number(secondsToAdd) * 1000;
  return new Date(expDate);
};

/**
 * Signs a message using AWS KMS
 *
 * @param message - Message to sign
 * @param keyId - KMS key ID
 */
const signWithKms = async (
  message: Buffer,
  keyId: string
): Promise<Uint8Array> => {
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
 * Signs the JWT header and payload and returns a full JWT string
 *
 * @param token - JWT components (header & payload)
 * @param keyId - KMS key ID used for signing
 */
const signJwt = async (token: JwtParts, keyId: string): Promise<string> => {
  const message = Buffer.from(`${token.header}.${token.payload}`);
  const signature = await signWithKms(message, keyId);

  const signatureBase64Url = base64url.encode(Buffer.from(signature));

  return `${token.header}.${token.payload}.${signatureBase64Url}`;
};
