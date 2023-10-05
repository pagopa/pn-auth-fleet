import { AuthPolicy } from "./authPolicy.js";

import { getOpenAPIS3Location } from "./apiGatewayUtils.js";
import { getCognitoUserTags, verifyIdToken } from "./cognitoUtils.js";
import { getAllowedResourcesFromS3 } from "./s3Utils.js";

const handleEvent = async function (event) {
  // Parameters
  const apiOptions = {};
  const tmp = event.methodArn.split(":");
  const apiGatewayArnTmp = tmp[5].split("/");
  const awsAccountId = tmp[4];
  apiOptions.region = tmp[3];
  apiOptions.restApiId = apiGatewayArnTmp[0];
  apiOptions.stage = apiGatewayArnTmp[1];
  const accessToken = event.authorizationToken;
  const principalId = accessToken;
  event.httpMethod = apiGatewayArnTmp[2];
  let path = "/";
  for (let i = 3; i < apiGatewayArnTmp.length; i++) {
    path += apiGatewayArnTmp[i];
    if (i < apiGatewayArnTmp.length - 1) path += "/";
  }
  event.path = path;

  // Get the openAPI file location from the tags of the Rest API
  const locationValues = await getOpenAPIS3Location(apiOptions);
  const bucketName = locationValues[0];
  const bucketKey = locationValues[1];
  const servicePath = locationValues[2];
  event.servicePath = servicePath;

  // Authorize
  const authorizeWithCognitoDecorated = logIfErrorDecorator(
    authorizeWithCognito,
    event,
    principalId,
    awsAccountId,
    apiOptions
  );
  const authResponse = await authorizeWithCognitoDecorated(
    event,
    accessToken,
    apiOptions,
    principalId,
    awsAccountId,
    bucketName,
    bucketKey
  );
  console.log(`AuthResponse: ${JSON.stringify(authResponse)}`);
  return authResponse;
};

// Decorator
const logIfErrorDecorator = (
  f,
  event,
  principalId,
  awsAccountId,
  apiOptions
) => {
  let authResponse;
  return async function (...args) {
    try {
      authResponse = await f(...args);
      return authResponse;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
};

const authorizeWithCognito = async (
  event,
  idToken,
  apiOptions,
  principalId,
  awsAccountId,
  bucketName,
  bucketKey
) => {
  // Instantiate policy
  const policy = new AuthPolicy(principalId, awsAccountId, apiOptions);

  // Check valdity of the bearer token
  const idTokenPayload = await getValidIdTokenPayload(idToken);
  if (!idTokenPayload) {
    console.log(`Token ${idToken} is invalid`);
    policy.denyAllMethods();
    const authResponse = policy.build();
    return authResponse;
  }

  // If valid, get tags and check that they match
  const userTags = getCognitoUserTags(idTokenPayload);
  const resources = await getAllowedResourcesFromS3(
    event,
    bucketName,
    bucketKey,
    userTags
  );

  for (let i = 0; i < resources.length; i++) {
    policy.allowMethod(resources[i].method, resources[i].path);
  }

  if (resources.length == 0) {
    policy.denyAllMethods();
  }

  const context = {
    uid: idTokenPayload.sub,
    cx_type: "BO",
  };

  const authResponse = policy.build(context);
  return authResponse;
};

const getValidIdTokenPayload = async (accessToken) => {
  // Token must be a Bearer Token and must be valid
  const isBearerToken = accessToken.startsWith("Bearer");
  if (!isBearerToken) {
    console.log(`Token is not a Bearer Token`);
    return false;
  }

  return await verifyIdToken(accessToken);
};

export { handleEvent };
