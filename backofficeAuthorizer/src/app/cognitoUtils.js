import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export const getCognitoUserAttributes = (accessToken) => {
    const userPoolArn = process.env.USER_POOL_ARN;
    const region = userPoolArn.split(':')[3];
    const cognitoClient = new CognitoIdentityProviderClient({ region: region});

    const command = new GetUserCommand({ AccessToken: accessToken });
    const response = cognitoClient.send(command)
        .then((data) => {
            let userAttributesTags;
            const attributeKeys = data.UserAttributes;
            console.log("Attribute keys: ", attributeKeys);
            const filteredKey = attributeKeys.filter((obj) => obj.Name.includes("custom:openapi-tags"));
            if (filteredKey.length === 0) {
                userAttributesTags = [];
            } else {
                userAttributesTags = filteredKey[0]['Value'].split(',').map((value) => value.trim());
            }
            console.log(`UserAttributes:${userAttributesTags}`);
            return userAttributesTags;
        })
        .catch((err) => {
            throw err;
        });
    return response;
};

export const verifyAccessToken = async (accessToken) => {
    // Verify validity of JWT
    const userPoolArn = process.env.USER_POOL_ARN;
    if(!userPoolArn){
        console.log(`Missing env variable USER_POOL_ARN`)
    }
    const clientId = process.env.CLIENT_ID;
    if(!clientId){
        console.log(`Missing env variable CLIENT_ID`);
        return false;
    }
    
    const userPoolArnTokens = userPoolArn.split("/")
    if(userPoolArnTokens.lenght<1){
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