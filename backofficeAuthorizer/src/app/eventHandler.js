const AuthPolicy = require("./authPolicy.js");
const { arraysOverlap } = require("./utils.js");
const { getMethodTagsFromS3 } = require("./s3Utils.js");
const { getOpenAPIS3Location } = require("./apiGatewayUtils.js");
const { getCognitoUserAttributes, verifyAccessToken } = require("./cognitoUtils.js");

const handleEvent = async function (event) {
    console.log('Method ARN: ' + event.methodArn);
    console.log(JSON.stringify(event));
    // Parameters
    let apiOptions = {};
    const tmp = event.methodArn.split(':');
    const apiGatewayArnTmp = tmp[5].split('/');
    const awsAccountId = tmp[4];
    apiOptions.region = tmp[3];
    apiOptions.restApiId = apiGatewayArnTmp[0];
    apiOptions.stage = apiGatewayArnTmp[1];
    const accessToken = event.authorizationToken;
    const principalId = accessToken;
    event.httpMethod = apiGatewayArnTmp[2];
    var path = '/';
    for(var i =3; i < apiGatewayArnTmp.length; i++) {
        path += apiGatewayArnTmp[i];
        if(i < (apiGatewayArnTmp.length-1)) 
            path += '/';
    } 
    event.path = path;
    console.log(`event path : ${event.path}`);

    // Get the openAPI file location from the tags of the Rest API
    const locationValues = await getOpenAPIS3Location(apiOptions);
    const bucketName = locationValues[0];
    const bucketKey = locationValues[1];
    const servicePath = locationValues[2]

    event.path = '/'+servicePath+event.path

    // Authorize
    const authorizeWithCognitoDecorated = denyIfErrorDecorator(authorizeWithCognito, event, principalId, awsAccountId, apiOptions);
    const authResponse = await authorizeWithCognitoDecorated(event, accessToken, apiOptions, principalId, awsAccountId, bucketName, bucketKey);
    console.log(`AuthResponse: ${JSON.stringify(authResponse)}`);
    return authResponse;
};

// Decorator
const denyIfErrorDecorator = (f, event, principalId, awsAccountId, apiOptions) => {
    let authResponse;
    return async function (...args) {
        try {
            authResponse = await f(...args);
            return authResponse;
        } catch (err) {
            console.error(err);
            let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
            policy.denyMethod(event.httpMethod, event.path);
            const authResponse = policy.build();
            return authResponse;
        }
    };
};

const authorizeWithCognito = async (event, accessToken, apiOptions, principalId, awsAccountId, bucketName, bucketKey) => {
    // Instantiate policy
    let policy = new AuthPolicy(principalId, awsAccountId, apiOptions);

    // Check valdity of the bearer token
    const tokenValid = await isTokenValid(accessToken);
    if (!tokenValid) {
        console.log(`Token ${accessToken} is invalid`);
        policy.denyMethod(event.httpMethod, event.path);
        const authResponse = policy.build();
        return authResponse;
    }

    // If valid, get tags and check that they match
    const bearerToken = accessToken.replace('Bearer ', '');
    const userAttributes = await getCognitoUserAttributes(bearerToken);
    console.log(userAttributes);
    const methodTags = await getMethodTagsFromS3(event, bucketName, bucketKey);
    console.log(methodTags);

    if (arraysOverlap(userAttributes, methodTags)) {
        policy.allowMethod(event.httpMethod, event.path);
    } else {
        policy.denyMethod(event.httpMethod, event.path);
    }
    const authResponse = policy.build();
    return authResponse;
};

const isTokenValid = async (accessToken) => {
    // Token must be a Bearer Token and must be valid
    const isBearerToken = accessToken.startsWith('Bearer');
    if (!isBearerToken) {
        console.log(`Token is not a Bearer Token`);
        return false;
    }

    return await verifyAccessToken(accessToken)
};

module.exports = {
    handleEvent
}
