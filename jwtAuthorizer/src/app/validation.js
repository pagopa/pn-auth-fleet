const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');
const AWS = require("aws-sdk");
const kms = new AWS.KMS();
const jsonwebtoken = require('jsonwebtoken');
const ValidationException = require('./exception/validationException.js');
let cachedPublicKey = {};

module.exports = {
    async validation (jwtToken){
        if(jwtToken){
            let decodedToken = await jwtValidator(jwtToken);
            console.log('token is valid');
            return decodedToken;    
        }else{
            throw new ValidationException("token is not valid")
        }
    }
}


async function jwtValidator(jwtToken) {
    const token = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token ', token)
    let decodedPublicKey
    if (cachedPublicKey && cachedPublicKey.expiresOn > Date.now()) {
        console.log( 'Using cached public key' )
        decodedPublicKey = cachedPublicKey.value;
    } else {
        let encodedPublicKey = await retrievePublicKey();
        decodedPublicKey = encodedPublicKey.PublicKey.toString("base64")
        console.debug( 'decodedPublicKey' , decodedPublicKey )
        setCachedData( decodedPublicKey )
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

const setCachedData = (val) =>{
    console.debug( 'Set cached public key' )
    cachedPublicKey = {
        expiresOn: Date.now() + process.env.CACHE_TTL * 1000,
        value: val
    }
}

async function retrievePublicKey() {
    console.debug( 'Retrieving public key from KMS' )
    let res = kms.getPublicKey({
        KeyId: process.env.KEY_ID 
    }).promise()
    return res;
}