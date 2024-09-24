const s3Utils = require("../middleware/s3Utils.js");
const apiGatewayUtils = require("../middleware/apiGatewayUtils");
const { AuthPolicy } = require("./authPolicy.js");
const GenericDatalCache = require("../cache/GenericDataCache.js");

// create one day cache
const apiTagsCache = new GenericDatalCache(86400);

async function getCustomPolicyDocument(lambdaEvent, callableApiTags){

    const apiOptions = getApiOption(lambdaEvent);
    
    let tags = apiTagsCache.getCacheItem(lambdaEvent.methodArn);
    // item missing in cache
    if (tags == null){
        const locationValues = await apiGatewayUtils.getOpenAPIS3Location(apiOptions);
        const bucketName = locationValues[0];
        const bucketKey = locationValues[1];
        tags = {bucketKey: bucketKey, bucketName: bucketName};
        apiTagsCache.setItem(lambdaEvent.methodArn, tags);
    }

    


   
    const resources = await s3Utils.getAllowedResourcesFromS3(
        lambdaEvent,
        tags.bucketName,
        tags.bucketKey,
        callableApiTags
    );

    const policy = new AuthPolicy(apiOptions.accountId, apiOptions);
    if(resources){
        for (let i = 0; i < resources.length; i++) {
            if(resources[i].method != 'PARAMETERS'){
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