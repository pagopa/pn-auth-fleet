import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

export const getCognitoUserAttributes = (accessToken) => {
    const cognitoClient = new CognitoIdentityProviderClient();

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