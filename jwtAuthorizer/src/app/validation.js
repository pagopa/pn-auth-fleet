const AWS = require("aws-sdk");
const kms = new AWS.KMS();
const jsonwebtoken = require('jsonwebtoken');
const ValidationException = require('./exception/validationException.js');
let cachedPublicKeyMap = new Map();


module.exports = {
    async validation (jwtToken){
        if(jwtToken){
            let decodedToken = await jwtValidator(jwtToken);
            console.info('token is valid');
            return decodedToken;    
        }else{
            throw new ValidationException("token is not valid")
        }
    }
}


async function jwtValidator(jwtToken) {
    const token = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token ', token)
    let keyId = token.header.kid;
    console.debug('header keyId ', keyId)
    let decodedPublicKey
    let cachedPublicKey = searchInCache(keyId);
    if ( cachedPublicKey ) {
        console.log( 'Using cached public key' )
        decodedPublicKey = cachedPublicKey;
    } else {
        let encodedPublicKey = await retrievePublicKey(keyId);
        decodedPublicKey = encodedPublicKey.PublicKey.toString("base64")
        console.debug( 'decodedPublicKey' , decodedPublicKey )
        setCachedData(keyId , decodedPublicKey )
    }
    try{
        let publicKeyPem = '-----BEGIN PUBLIC KEY-----\n' + decodedPublicKey + '\n-----END PUBLIC KEY-----'
        console.debug( 'publicKeyPem', publicKeyPem )
        jsonwebtoken.verify(jwtToken, publicKeyPem)
    }catch(err){
        console.error('Validation error ', err)
        throw new ValidationException(err.message)
    }
    console.log("success!");
    return token.payload;
}

const setCachedData = (keyId, val) =>{
    console.debug( 'Set cached public key' )
    cachedPublicKeyMap.set( keyId, { expiresOn: Date.now() + process.env.CACHE_TTL * 1000, value: val });
}

async function retrievePublicKey(keyId) {
    console.debug( 'Retrieving public key from KMS' )
    let res = kms.getPublicKey({
        KeyId: keyId
    }).promise()
    return res;
}

function searchInCache(keyId) {
    let result = cachedPublicKeyMap.get( keyId )
    if ( result && result.expiresOn > Date.now() ) {
        return result.value;
    } else {
        return null;
    }
}
