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
const { anonymizeKey } = require("./utils.js");

async function getApiKeyByIndex(virtualKey) {
  const ddbClient = new DynamoDBClient();
  const ddbDocClient = AWSXRay.captureAWSv3Client(
    DynamoDBDocumentClient.from(ddbClient)
  );

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
    throw new ItemNotFoundException(anonymizeKey(virtualKey), TableName);
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
    pdnd: apiKeyItem["pdnd"],
  };
}

async function getPaAggregationById(cxId) {
  const tableName = "pn-paAggregations";
  return getItemById(tableName, "x-pagopa-pn-cx-id", cxId);
}

async function getPaAggregateById(aggregateId) {
  const tableName = "pn-aggregates";
  return getItemById(tableName, "aggregateId", aggregateId);
}

async function getItemById(TableName, keyName, keyValue) {
  const ddbClient = new DynamoDBClient();
  const ddbDocClient = AWSXRay.captureAWSv3Client(
    DynamoDBDocumentClient.from(ddbClient)
  );
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

module.exports = { getApiKeyByIndex, getPaAggregateById, getPaAggregationById };
