const AWS = require("aws-sdk");
const kms = new AWS.KMS();
const base64url = require("base64url");
const properties = require('../properties.js')

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
    console.log('token ', token);

    return token;
}

function getTokenComponent(decodedToken) {
    let header = {
        "alg": "RS256",
        "typ": "JWT"
    };
    
    const expDate = getExpDate();

    let payload = {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expDate.getTime() / 1000),
        uid: decodedToken.uid,
        iss: 'pagopa.notifiche.it', //TODO Da cambiare
    };

    let token_components = {
        header: base64url(JSON.stringify(header)),
        payload: base64url(JSON.stringify(payload)),
    };
    return token_components;
}

Date.prototype.addMinutes= function(minutes){
    var date = new Date(this.getTime());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
}

module.exports = {
    async generateToken(decodedToken){
        const keyId = properties.getProperty('aws.keyid');

        let token_components = getTokenComponent(decodedToken);
        
        let res = await sign(token_components, keyId)
        console.log(`JWT token: [${res}]`)
        return res;
    }
}
function getExpDate() {
    const minutesToAdd = properties.getProperty('application.expMinutes');
    const now = new Date();
    const expDate = now.addMinutes(minutesToAdd);
    console.log('Exp date', expDate);
    return expDate;
}

