const { ddbDocClient } = require('./DynamoDbClient')
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ATTR_PREFIX } = require('./constants');

function buildHashKeyForAttributeResolver(jwt, attrResolverCfg){
  return ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwt[ attrResolverCfg.keyAttributeName ]
}

async function listJwtAttributes(jwt, attrResolverCfg) {
    const nowEpochSec = Math.floor(Date.now() / 1000);
    const getCommandInput = {
      TableName: process.env.AUTH_JWT_ATTRIBUTE_TABLE,
      Key: {
        hashKey: buildHashKeyForAttributeResolver(jwt, attrResolverCfg),
        sortKey: ''
      }
    };
    const getCommand = new GetCommand(getCommandInput)
    const result = await ddbDocClient.send(getCommand);
    console.log(result.Item.hasOwnProperty('cacheMaxUsageEpochSec'))
    console.log(result.Item['cacheMaxUsageEpochSec'] + "<=" + nowEpochSec)
    if (result.Item && result.Item.hasOwnProperty('cacheMaxUsageEpochSec') && result.Item.cacheMaxUsageEpochSec <= nowEpochSec) {
      console.log("Elemento ignorato per cacheMaxUsageEpochSec non valido.");
      return null;
    }
    console.log("Elemento valido:", result.Item);
    return result.Item;
  }


module.exports = {
    listJwtAttributes
}