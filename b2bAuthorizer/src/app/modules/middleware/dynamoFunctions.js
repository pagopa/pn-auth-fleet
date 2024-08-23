const {
  GetCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} = require("@aws-sdk/lib-dynamodb"); /* refers to: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html#dynamodb-example-document-client-query */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const AWSXRay = require("aws-xray-sdk"); /* refers to: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html */

const {
  ItemNotFoundException,
  TooManyItemsFoundException,
} = require("./exceptions.js");

const ddbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient());
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

async function getApiKeyByIndex(virtualKey) {
  const TableName = "pn-apiKey";

  const params = {
    TableName,
    IndexName: "virtualKey-id-index",
    KeyConditionExpression: "#vK = :virtualKey",
    ExpressionAttributeNames: {
      "#vK": "virtualKey",
    },
    ExpressionAttributeValues: {
      ":virtualKey": virtualKey,
    },
  };

  const command = new QueryCommand(params);
  const apiKeyItems = await ddbDocClient.send(command);

  if (!apiKeyItems.Items || apiKeyItems.Items.length === 0) {
    throw new ItemNotFoundException(null, TableName);
  }

  if (apiKeyItems.Items.length > 1) {
    throw new TooManyItemsFoundException(TableName);
  }

  const apiKeyItem = apiKeyItems.Items[0];

  return {
    id: apiKeyItem["id"],
    cxId: apiKeyItem["x-pagopa-pn-cx-id"],
    groups: apiKeyItem["groups"],
    status: apiKeyItem["status"],
    virtualKey: apiKeyItem["virtualKey"],
    uid: apiKeyItem["x-pagopa-pn-uid"]
    cxType: apiKeyItem["x-pagopa-pn-cx-type"]
    scope: apiKeyItem["scope"],
  };
}

async function getItemById(TableName, keyName, keyValue) {
  const command = new GetCommand({
    TableName,
    Key: {
      [keyName]: keyValue,
    },
  });

  const dynamoItem = await ddbDocClient.send(command);

  if (!dynamoItem || !dynamoItem.Item) {
    throw new ItemNotFoundException(keyValue, TableName);
  }

  return dynamoItem.Item;
}

module.exports = { getApiKeyByIndex};
