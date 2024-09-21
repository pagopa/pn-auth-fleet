const s3Utils = require("../middleware/s3Utils.js");
const apiGatewayUtils = require("../middleware/apiGatewayUtils.js");
const { AuthPolicy } = require("./authPolicy.js");

async function getCustomPolicyDocument(lambdaEvent, callableApiTags){
    const apiOptions = getApiOption(lambdaEvent);

    const locationValues = await apiGatewayUtils.getOpenAPIS3Location(apiOptions);
    const bucketName = locationValues[0];
    const bucketKey = locationValues[1];
   
    const resources = await s3Utils.getAllowedResourcesFromS3(
        lambdaEvent,
        bucketName,
        bucketKey,
        callableApiTags
    );

    const policy = new AuthPolicy(apiOptions.accountId, apiOptions);
    if(resources){
        console.log('resources',resources)
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