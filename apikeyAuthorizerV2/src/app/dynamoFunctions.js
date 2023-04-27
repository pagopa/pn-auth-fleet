const { ItemNotFoundException, TooManyItemsFoundException } = require("./exceptions.js");
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const utils = require("./utils");

module.exports.getApiKeyByIndex = async (virtualKey) => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const TableName = "pn-apiKey";

    const params = {
        TableName,
        IndexName: 'virtualKey-id-index',
        KeyConditionExpression: '#vK = :virtualKey',
        ExpressionAttributeNames:{
            "#vK": "virtualKey"
        },
        ExpressionAttributeValues: {
            ":virtualKey": virtualKey
        }
    };

    const apiKeyItems = await docClient.query(params).promise();

    if(!apiKeyItems.Items || apiKeyItems.Items.length === 0){
        throw new ItemNotFoundException(utils.anonymizeKey(virtualKey), TableName);
    }
        
    if(apiKeyItems.Items.length > 1) {
        throw new TooManyItemsFoundException(TableName);
    }

    const apiKeyItem = apiKeyItems.Items[0];

    return {
        cxId : apiKeyItem["x-pagopa-pn-cx-id"],
        groups: apiKeyItem["groups"],
        status: apiKeyItem["status"],
        virtualKey: apiKeyItem["virtualKey"],
        pdnd: apiKeyItem["pdnd"]
    };
}

module.exports.getPaAggregationById = async (cxId) => {
    const tableName = "pn-paAggregations";
    return getItemById(tableName, "x-pagopa-pn-cx-id", cxId);
}

module.exports.getPaAggregateById = async (aggregateId) => {
    const tableName = "pn-aggregates";
    return getItemById(tableName, "aggregateId", aggregateId);
};

const getItemById = async (TableName, keyName, keyValue) => {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const dynamoItem = await docClient.get({
        TableName,
        Key: {
            [keyName]: keyValue
        }
    }).promise();

    if(!dynamoItem.Item) {
        throw new ItemNotFoundException(keyValue, TableName);
    }

    return dynamoItem.Item;
}



