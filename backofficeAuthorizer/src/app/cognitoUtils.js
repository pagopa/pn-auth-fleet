const { CognitoJwtVerifier } = require("aws-jwt-verify");

const getCognitoUserTags = (idTokenPayload) => {

    if(idTokenPayload["custom:backoffice_tags"]){
        return idTokenPayload["custom:backoffice_tags"].split(',').map(function(t){
            return t.trim();
        })
    } else {
        return  []
    }
};

const verifyIdToken = async (accessToken) => {
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
        tokenUse: "id",
        clientId: clientId,
    });
    
    try {
        const payload = await verifier.verify(
          accessToken.replace('Bearer ', '') // the JWT as string
        );
        console.log("Token is valid. Payload:", payload);
        return payload;
    } catch (err) {
        console.error(err);
        console.log("Token not valid!");
        return false
    }
}

module.exports = {
    getCognitoUserTags,
    verifyIdToken
}