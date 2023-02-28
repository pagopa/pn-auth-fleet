const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const kms = new AWS.KMS();
const base64url = require("base64url");
const { getUserType } = require("./utils");

const organizationFCToIdMap = {
    "06363391001": "d9209523-7a6b-44fc-81a3-30a8a9bf5c1c",
    "CCRMCT06A03A433H": "c8337798-e872-4ce9-93ca-f164309873f9",
    "20517490320": "aa200ece-b0bc-49a3-be59-559c6ee3a1a4",
    "70472431207": "3e22b2ec-a9e9-41c0-9932-a894979d87a9",
    "27937810870": "0d7ba4c2-0abf-4013-bbac-2ad43bbf4fe3",
    "12825810299": "3f7db9ca-0e24-45e1-9cd3-f0b185e69def",
}

module.exports = {
    async generateToken(decodedToken, isDev){
        const keyAlias = process.env.KEY_ALIAS;
        let keyId = await getKeyId(keyAlias);
        console.debug( 'keyId from alias', keyId )
        let token_components = getTokenComponent(decodedToken, keyId, isDev);
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

function getTokenComponent(decodedToken, keyId, isDev) {
    let header = {
        "alg": "RS256",
        "typ": "JWT",
        "kid": keyId
    };
    const expDate = getExpDate();
    
    const payload = {
        "iat": Math.floor(Date.now() / 1000),
        "exp": decodedToken.desired_exp ?? Math.floor(expDate.getTime() / 1000),
        "uid": decodedToken.uid,
        "iss": process.env.ISSUER,
        "aud": process.env.AUDIENCE,
        "jti": decodedToken.jti
    };

    let organization = {};
    if (decodedToken.organization) {
        organization.id = isDev && getUserType(decodedToken) === 'PG'
          ? organizationFCToIdMap[decodedToken.organization.fiscal_code]
          : decodedToken.organization.id;
        organization.role = decodedToken.organization.roles[0].role;
        organization.groups = decodedToken.organization.groups;
        organization.fiscal_code = decodedToken.organization.fiscal_code;
        payload.organization = organization;
    }

    return {
        header: base64url(JSON.stringify(header)),
        payload: base64url(JSON.stringify(payload)),
    };
}

function getExpDate() {
    const secondsToAdd = process.env.TOKEN_TTL;
    const expDate = Date.now() + secondsToAdd * 1000
    console.debug('Exp date', new Date(expDate));
    return new Date(expDate);
}

function getSignature(message, keyId) {
    return kms.sign({
        Message: message,
        KeyId: keyId,
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
        MessageType: 'RAW'
    }).promise()
}

async function sign(tokenParts, keyId) {
    const message = Buffer.from(tokenParts.header + "." + tokenParts.payload);
    const res = await getSignature(message, keyId);
    tokenParts.signature = res.Signature.toString("base64")
                                        .replace(/\+/g, '-')
                                        .replace(/\//g, '_')
                                        .replace(/=/g, '');
    const token = tokenParts.header + "." + tokenParts.payload + "." + tokenParts.signature;
    console.debug('token ', token);
    return token;
}
