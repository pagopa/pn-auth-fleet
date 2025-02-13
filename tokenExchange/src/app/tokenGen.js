const { DescribeKeyCommand, KMS, SignCommand } = require("@aws-sdk/client-kms");
const AWSXRay = require("aws-xray-sdk-core");
const base64url = require("base64url");

const kms = AWSXRay.captureAWSv3Client(new KMS());

async function generateToken(decodedToken) {
  const keyAlias = process.env.KEY_ALIAS;
  const keyId = await getKeyId(keyAlias);
  console.debug("keyId from alias", keyId);
  const token_components = getTokenComponent(decodedToken, keyId);
  console.debug("token_components", token_components);
  const res = await sign(token_components, keyId);
  console.debug(`JWT token: [${res}]`);
  return res;
}

async function getKeyId(keyAlias) {
  console.info("Retrieving keyId from alias: ", keyAlias);
  const params = {
    KeyId: keyAlias,
  };
  const command = new DescribeKeyCommand(params);
  const key = await kms.send(command);
  return key.KeyMetadata.KeyId;
}

function getTokenComponent(decodedToken, keyId) {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: keyId,
  };
  const expDate = getExpDate();

  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: decodedToken.desired_exp ?? Math.floor(expDate.getTime() / 1000),
    uid: decodedToken.uid,
    iss: process.env.ISSUER,
    aud: process.env.AUDIENCE,
    jti: decodedToken.jti,
  };

  const organization = {};
  if (decodedToken.organization) {
    organization.id = decodedToken.organization.id;
    organization.role = decodedToken.organization.roles[0].role;
    organization.groups = decodedToken.organization.groups;
    organization.fiscal_code = decodedToken.organization.fiscal_code;
    payload.organization = organization;
  }

  const source = {};
  if (decodedToken.source) {
    source.channel = decodedToken.source.channel;
    source.details = decodedToken.source.details;
    payload.source = source;
  }

  return {
    header: base64url(JSON.stringify(header)),
    payload: base64url(JSON.stringify(payload)),
  };
}

function getExpDate() {
  const secondsToAdd = process.env.TOKEN_TTL;
  const expDate = Date.now() + secondsToAdd * 1000;
  console.debug("Exp date", new Date(expDate));
  return new Date(expDate);
}

async function getSignature(message, keyId) {
  const command = new SignCommand({
    Message: message,
    KeyId: keyId,
    SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
    MessageType: "RAW",
  });
  const signature = await kms.send(command);
  return signature;
}

async function sign(tokenParts, keyId) {
  const message = Buffer.from(tokenParts.header + "." + tokenParts.payload);
  const res = await getSignature(message, keyId);
  tokenParts.signature = Buffer.from(res.Signature, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const token =
    tokenParts.header + "." + tokenParts.payload + "." + tokenParts.signature;
  console.debug("token ", token);
  return token;
}

module.exports = { generateToken };
