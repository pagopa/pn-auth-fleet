const { ddbDocClient } = require('./DynamoDbClient')
const { GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ATTR_PREFIX } = require('./constants');

function buildHashKeyForAttributeResolver(jwt, attrResolverCfg){
  return ATTR_PREFIX + "~" + jwt.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwt[ attrResolverCfg.keyAttributeName ]
}

function buildHashKeyFromAuthIssuer(jwtIssuer){
  if(attrResolverCfg.keyAttributeName === 'iss') {
    return ATTR_PREFIX + "~" + jwtIssuer.iss + "~" + attrResolverCfg.keyAttributeName + "~" + jwtIssuer.iss
  }
  console.log('attrResolverCfg is not iss')
}

async function listJwtAttributes(jwt, attrResolverCfg) {
    const nowEpochSec = Math.floor(Date.now() / 1000);
    const getCommandInput = {
      TableName: process.env.AUTH_JWT_ATTRIBUTE_TABLE,
      Key: {
        hashKey: buildHashKeyForAttributeResolver(jwt, attrResolverCfg),
        sortKey: 'NA'
      }
    };
    const getCommand = new GetCommand(getCommandInput)
    const result = await ddbDocClient.send(getCommand);
     if (result.Item && result.Item.hasOwnProperty('cacheMaxUsageEpochSec') && result.Item.cacheMaxUsageEpochSec <= nowEpochSec) {
      console.log("Elemento ignorato per cacheMaxUsageEpochSec non valido.");
      return null;
    }
    console.log("Elemento valido:", result.Item);
    return result.Item;
}

async function deleteJwtAttributesByJwtIssuer(jwtIssuer){

    const itemKey = buildHashKeyFromAuthIssuer(jwtIssuer);
    const params = {
      TableName: process.env.AUTH_JWT_ATTRIBUTE_TABLE,
      Key: {
        hashKey: itemKey,
        sortKey: 'NA'
      }
    };
  
    try {
      await ddbDocClient.send(new DeleteCommand(params));
      console.info("DeleteItem succeeded:", itemKey);
    } catch (err) {
      console.error("Unable to delete item "+itemKey+". Error JSON:", JSON.stringify(err, null, 2));
      throw err;
    }
}
  

module.exports = {
    listJwtAttributes,
    deleteJwtAttributesByJwtIssuer
}