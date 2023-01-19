const { CognitoIdentityProviderClient, GetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const getCognitoUserAttributes = (accessToken) => {
    const userPoolArn = process.env.USER_POOL_ARN;
    const region = userPoolArn.split(':')[3];
    const cognitoClient = new CognitoIdentityProviderClient({ region: region});

    const command = new GetUserCommand({ AccessToken: accessToken });
    const response = cognitoClient.send(command)
        .then((data) => {
            let userAttributesTags;
            const attributeKeys = data.UserAttributes;
            const filteredKey = attributeKeys.filter((obj) => obj.Name.includes("custom:openapi-tags"));
            if (filteredKey.length === 0) {
                userAttributesTags = [];
            } else {
                userAttributesTags = filteredKey[0]['Value'].split(',').map((value) => value.trim());
            }
            return userAttributesTags;
        })
        .catch((err) => {
            throw err;
        });
    return response;
};

const verifyAccessToken = async (accessToken) => {
    // Verify validity of JWT
    const userPoolArn = process.env.USER_POOL_ARN;
    if(!userPoolArn){
        console.log(`Missing env variable USER_POOL_ARN`);
        return false;
    }
    const clientId = process.env.CLIENT_ID;
    if(!clientId){
        console.log(`Missing env variable CLIENT_ID`);
        return false;
    }
    
    const userPoolArnTokens = userPoolArn.split("/")
    if(userPoolArnTokens.length<=1){
        console.log(`Invalid UserPoolArn format`);
        return false;
    }

    const verifier = CognitoJwtVerifier.create({
        userPoolId: userPoolArnTokens[1],
        tokenUse: "access",
        clientId: clientId,
    });
    
    try {
        const payload = await verifier.verify(
          accessToken.replace('Bearer ', '') // the JWT as string
        );
        console.log("Token is valid. Payload:", payload);
        return true;
    } catch (err) {
        console.error(err);
        console.log("Token not valid!");
        return false
    }
}

module.exports = {
    getCognitoUserAttributes,
    verifyAccessToken
}