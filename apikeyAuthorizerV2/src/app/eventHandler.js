// for testing purpose, we mustn't destructure the import; stub doesn't mock destructured object
const dynamoFunctions = require("./dynamoFunctions.js");
const {
  AudienceValidationException,
  ItemNotFoundException,
  KeyStatusException,
  ValidationException,
} = require("./exceptions.js");
const { generateIAMPolicy } = require("./iamPolicyGenerator.js");
const {
  anonymizeKey,
  findAttributeValueInObjectWithInsensitiveCase,
  logIamPolicy,
} = require("./utils.js");
const { validation } = require("./validation.js");

const defaultDenyAllPolicy = {
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Deny",
        Resource: "*",
      },
    ],
  },
};

async function eventHandler(event, context) {
  try {
    const virtualKey = findAttributeValueInObjectWithInsensitiveCase(
      event.headers,
      "x-api-key"
    );

    const apiKeyDynamo = await dynamoFunctions.getApiKeyByIndex(virtualKey);

    if (!checkStatus(apiKeyDynamo.status)) {
      throw new KeyStatusException(
        `Key is not allowed with status ${apiKeyDynamo.status}`
      );
    }

    const paAggregationDynamo = await dynamoFunctions.getPaAggregationById(
      apiKeyDynamo.cxId
    );
    console.log("Aggregate ID found -> ", paAggregationDynamo.aggregateId);

    const aggregateDynamo = await dynamoFunctions.getPaAggregateById(
      paAggregationDynamo.aggregateId
    );
    console.log(
      "AWS ApiKey Found -> ",
      anonymizeKey(aggregateDynamo.AWSApiKey)
    );

    let contextAuth;
    const encodedToken = findAttributeValueInObjectWithInsensitiveCase(
      event.headers,
      "Authorization"
    )?.replace("Bearer ", "");
    if (apiKeyDynamo.pdnd === false) {
      if (encodedToken) {
        throw new ValidationException(
          "PDND Token is not required, you have to use only API-KEY to access this resource"
        );
      }
      contextAuth = {
        uid: "APIKEY-" + apiKeyDynamo.id,
        cx_id: apiKeyDynamo.cxId,
        cx_groups: apiKeyDynamo?.groups?.join(),
        cx_type: "PA",
        sourceChannelDetails: "NONINTEROP",
      };
    } else {
      if (encodedToken) {
        console.log("encodedToken", encodedToken);
        const decodedToken = await validation(encodedToken);
        contextAuth = {
          uid: "PDND-" + decodedToken.client_id,
          cx_id: apiKeyDynamo.cxId,
          cx_groups: apiKeyDynamo?.groups?.join(),
          cx_type: "PA",
          sourceChannelDetails: "INTEROP",
        };
      } else {
        throw new ValidationException(
          "PDND Token is required, you have to use both APIKEY and PDND token to access this resource"
        );
      }
    }
    const iamPolicy = generateIAMPolicy(
      event.methodArn,
      contextAuth,
      aggregateDynamo.AWSApiKey
    );
    logIamPolicy(iamPolicy);
    return iamPolicy;
  } catch (error) {
    return handleError(error);
  }
}

function checkStatus(status) {
  return status === "ENABLED" || status === "ROTATED";
}

function handleError(error) {
  if (
    error instanceof KeyStatusException ||
    error instanceof AudienceValidationException ||
    error instanceof ValidationException ||
    error instanceof ItemNotFoundException
  ) {
    console.warn("Error generating IAM policy with error ", error);
  } else {
    console.error("Error generating IAM policy with error ", error);
  }
  return defaultDenyAllPolicy;
}

module.exports = { eventHandler };
