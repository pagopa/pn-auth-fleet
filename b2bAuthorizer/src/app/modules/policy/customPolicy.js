const s3Utils = require("../middleware/s3Utils.js");
const apiGatewayUtils = require("../middleware/apiGatewayUtils.js");

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
    // let policyDocument = {
    //     Version: "2012-10-17",
    //     Statement: []
    // };

    // if(resources){
    //     for (let i = 0; i < resources.length; i++) {
    //         // arn example -> "arn:aws:execute-api:region:account-id:api-id/stage/METHOD_HTTP_VERB/Resource-path"
    //         const resourceArn = `arn:aws:execute-api:${apiOptions.region}:${apiOptions.accountId}:${apiOptions.restApiId}/${apiOptions.stage}/${resources[i].method}/${resources[i].path}`;
    //         policyDocument.Statement.push({
    //             Action: "execute-api:Invoke",
    //             Effect: "Allow",
    //             Resource: resourceArn,
    //         });
    //     }
    // }

    return policyDocument;
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
