const {
  ItemNotFoundException,
  TooManyItemsFoundException,
} = require("./exceptions.js");
const utils = require("./utils");
const { ddbDocClient } = require("./ddbClient.js");
const {
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb"); /* refers to: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html#dynamodb-example-document-client-query */

module.exports.getApiKeyByIndex = async (virtualKey) => {
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
    throw new ItemNotFoundException(utils.anonymizeKey(virtualKey), TableName);
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
};

module.exports.getPaAggregationById = async (cxId) => {
  const tableName = "pn-paAggregations";
  return getItemById(tableName, "x-pagopa-pn-cx-id", cxId);
};

module.exports.getPaAggregateById = async (aggregateId) => {
  const tableName = "pn-aggregates";
  return getItemById(tableName, "aggregateId", aggregateId);
};

const getItemById = async (TableName, keyName, keyValue) => {
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
};
