const AWS = require("aws-sdk");
const kms = new AWS.KMS();
const base64url = require("base64url");


module.exports = {
    async generateToken(decodedToken){
        const keyAlias = process.env.KEY_ALIAS;
        let keyId = await getKeyId(keyAlias);
        console.debug( 'keyId from alias', keyId )
        let token_components = getTokenComponent(decodedToken, keyId);
        console.debug( 'token_components', token_components )
        let res = await sign(token_components, keyId)
        console.debug(`JWT token: [${res}]`)
        return res;
    }
}

async function getKeyId(keyAlias) {
    console.info( 'Retrieving keyId from alias: ', keyAlias )
    const params = {
        KeyId: keyAlias
    }
    const key = await kms.describeKey(params).promise();
    return key.KeyMetadata.KeyId;
}

function getTokenComponent(decodedToken,keyId) {
    let header = {
        "alg": "RS256",
        "typ": "JWT",
        "kid": keyId
    };
    const expDate = getExpDate();
    let payload = {
        "iat": Math.floor(Date.now() / 1000),
        "exp": Math.floor(expDate.getTime() / 1000),
        "uid": decodedToken.uid,
        "iss": process.env.ISSUER,
        "aud": process.env.AUDIENCE,
        "organization": {
            "id": decodedToken.organization?.id,
            "role": decodedToken.organization?.role,
            "fiscal_code": decodedToken.organization?.fiscal_code,
            "groups": decodedToken.groups
        },
    };
    let token_components = {
        header: base64url(JSON.stringify(header)),
        payload: base64url(JSON.stringify(payload)),
    };
    return token_components;
}

function getExpDate() {
    const secondsToAdd = process.env.TOKEN_TTL;
    const expDate = Date.now() + secondsToAdd * 1000
    console.debug('Exp date', new Date(expDate));
    return new Date(expDate);
}

async function sign(tokenParts, keyId) {
    let message = Buffer.from(tokenParts.header + "." + tokenParts.payload)
    let res = await kms.sign({
        Message: message,
        KeyId: keyId,
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
        MessageType: 'RAW' 
    }).promise()
    tokenParts.signature = res.Signature.toString("base64")
                                        .replace(/\+/g, '-')
                                        .replace(/\//g, '_')
                                        .replace(/=/g, '');
    let token = tokenParts.header + "." + tokenParts.payload + "." + tokenParts.signature;
    console.debug('token ', token);
    return token;
}
