const s3Utils = require("../middleware/s3Utils.js");
const apiGatewayUtils = require("../middleware/apiGatewayUtils");
const { AuthPolicy } = require("./authPolicy.js");
const GenericDatalCache = require("../cache/GenericDataCache.js");

// create one day cache
const apiResourcesCache = new GenericDatalCache(86400);

async function getCustomPolicyDocument(lambdaEvent, callableApiTags){
    const apiOptions = getApiOption(lambdaEvent);
    
    let resources = apiResourcesCache.getCacheItem(lambdaEvent.methodArn);
    // item missing in cache
    if (resources == null){
        console.log("RESOURCES NOT cached for", lambdaEvent.methodArn);
        const locationValues = await apiGatewayUtils.getOpenAPIS3Location(apiOptions);
        const bucketName = locationValues[0];
        const bucketKey = locationValues[1];
       
        resources = await s3Utils.getResourcesFromS3(
            lambdaEvent,
            bucketName,
            bucketKey
        );
       
        apiResourcesCache.setCacheItem(lambdaEvent.methodArn, resources);
    }
    else console.log("RESOURCES  cached for", lambdaEvent.methodArn);

    const policy = new AuthPolicy(apiOptions.accountId, apiOptions);
    if(resources){
        for (let i = 0; i < resources.length; i++) {
            if(resources[i].method != 'PARAMETERS' || !resources[i].tags || arraysOverlap(resources[i].tags, callableApiTags)){
                policy.allowMethod(resources[i].method, resources[i].path);
            }
        }
    }
    return policy.build();
}

function getApiOption(lambdaEvent){
    const tmp = lambdaEvent.methodArn.split(":");
    const apiGatewayArnTmp = tmp[5].split("/");
    const apiOptions = {};
    apiOptions.accountId = tmp[4];
    apiOptions.region = tmp[3];
    apiOptions.restApiId = apiGatewayArnTmp[0];
    apiOptions.stage = apiGatewayArnTmp[1];
    return apiOptions;
}

module.exports = { getCustomPolicyDocument };