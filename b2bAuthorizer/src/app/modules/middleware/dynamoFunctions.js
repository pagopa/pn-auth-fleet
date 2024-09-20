const {
  GetCommand,
  QueryCommand,
  DynamoDBDocumentClient,
} = require("@aws-sdk/lib-dynamodb"); /* refers to: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html#dynamodb-example-document-client-query */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  ItemNotFoundException,
  TooManyItemsFoundException,
} = require("../../errors/exceptions");


const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient());

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
    throw new ItemNotFoundException(TableName);
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
    uid: apiKeyItem["x-pagopa-pn-uid"],
    cxType: apiKeyItem["x-pagopa-pn-cx-type"],
    scope: apiKeyItem["scope"],
  };
}

module.exports = { getApiKeyByIndex};
