const { ddbDocClient } = require('./DynamoDbClient')
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { ATTR_PREFIX } = require('./constants');

function buildHashKeyForAttributeResolver(jwt, attrResolverCfg){
    return ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwtEssentalFields[ attrResolverCfg.keyAttributeName ]
}

async function listJwtAttributes(jwt, attrResolverCfg) {
    const nowEpochSec = Math.floor(Date.now() / 1000);
    const queryCommandInput = {
        TableName: process.env.AUTH_JWT_ATTRIBUTE_TABLE,
        KeyConditionExpression: "#hashKey = :hashValue",
        FilterExpression: "attribute_not_exists(cacheMaxUsageEpochSec) OR cacheMaxUsageEpochSec > :nowEpochSec",
        ExpressionAttributeNames: {
          "#hashKey": "hashKey" 
        },
        ExpressionAttributeValues: {
          ":hashValue": buildHashKeyForAttributeResolver(jwt, attrResolverCfg),
          ":nowEpochSec": nowEpochSec
        }
      };
    const queryCommand = new QueryCommand(queryCommandInput)

    const result = await ddbDocClient.send(queryCommand)

    return result.Items
  }


module.exports = {
    listJwtAttributes
}