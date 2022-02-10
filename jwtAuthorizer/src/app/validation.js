const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');
const AWS = require("aws-sdk");
const kms = new AWS.KMS();
const jsonwebtoken = require('jsonwebtoken');
var ValidationException = require('./exception/validationException.js');

module.exports = {
    async validation (jwtToken, cachedPublicKey){
        if(jwtToken){
            let decodedToken = await jwtValidator(jwtToken, cachedPublicKey);
            console.info('token is valid');
            return decodedToken;    
        }else{
            throw new ValidationException("token is not valid")
        }
    }
}


async function jwtValidator(jwtToken, cachedPublicKey) {
    const token = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token', token)
    let publicKey;
    if (cachedPublicKey && cachedPublicKey.expiresOn > Date.now()) {
        publicKey = cachedPublicKey.value;
    } else {
        publicKey = await retrievePublicKey();
        setCachedData(publicKey)
    }
    try{
        jsonwebtoken.verify(jwtToken, publicKey)
    }catch(err){
        console.error('Validation error ', err)
        throw new ValidationException(err.message)
    }
    console.log("success!");
    return token.payload;
}

const setCachedData = (val) =>{
    cachedPublicKey = {
        expiresOn: Date.now() + 3600 * 1000, // Set expiry time of 1H
        value: val
    }
}

async function retrievePublicKey() {
    let res = kms.getPublicKey({
        KeyId: process.env.KEY_ID 
    }).promise()

    console.log('res');
    return res.PublicKey;
}