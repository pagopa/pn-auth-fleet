const jsonwebtoken = require('jsonwebtoken');
const retrieverPdndJwks = require('./retrieverPdndJwks.js');
const { ValidationException } = require('./exceptions.js');
const crypto = require('crypto');

let cachedPublicKeyMap = new Map();

module.exports = {
    async validation(jwtToken) {
        if (jwtToken) {
            let decodedToken = await jwtValidator(jwtToken);
            console.info('token is valid');
            return decodedToken;    
        } else {
            throw new ValidationException("token is not valid")
        }
    }
}

async function jwtValidator(jwtToken) {
     const token = jsonwebtoken.decode(jwtToken, { complete: true });
     let keyId = token.header.kid;
     let tokenHeader = token.header
     validateTokenHeader(tokenHeader)
     let issuer = token.payload.iss
     validateTokenIssuer(issuer)
     let publicKey = await getDecodedPublicKey(issuer, keyId)
     try{
        jsonwebtoken.verify(jwtToken, publicKey, {issuer: process.env.PDND_ISSUER, audience: process.env.PDND_AUDIENCE})
     }catch(err){
        throw new ValidationException(err.message)
     }
     console.debug('token payload', token.payload)
     console.log("success!");
     return token.payload;
   }

async function getDecodedPublicKey(issuer, keyId){
    let cachedPublicKey = searchInCache(keyId);
    let decodedPublicKey
    if ( cachedPublicKey ) {
        console.log( 'Using cached public key' )
        decodedPublicKey = cachedPublicKey;
    } else {
        publicKey = await retrievePublicKey(issuer, keyId);
        let key = crypto.createPublicKey({ format: "jwk", key: { "kty": publicKey.kty, "n": publicKey.n, "e": publicKey.e }});
        decodedPublicKey = key.export({format:'pem',type:'spki'});
        setCachedData(keyId , decodedPublicKey )
    }
    return decodedPublicKey;
}

const setCachedData = (keyId, val) =>{
    console.debug( 'Set cached public key' )
    cachedPublicKeyMap.set( keyId, { expiresOn: Date.now() + process.env.CACHE_TTL * 1000, value: val });
}

async function retrievePublicKey(issuer, keyId) {
    console.debug( 'Retrieving public key from PDND' )
    const jwks = await retrieverPdndJwks.getJwks(issuer);
    let publicKey = findKey(jwks, keyId);
    return publicKey;
}

function findKey(jwks, keyId) {
    for (let key of jwks.keys) {
        if (key.kid === keyId) {
            console.debug('Found key', key.kid);
            return key;
        }
    }
}

function searchInCache(keyId) {
    let result = cachedPublicKeyMap.get( keyId )
    if ( result && result.expiresOn > Date.now() ) {
        return result.value;
    } else {
        return null;
    }
}

function validateTokenHeader(tokenHeader){
    let tokenType = tokenHeader.typ
    if(tokenType != "at+jwt"){
         console.warn('Validation error: Invalid token Type')
         throw new ValidationException('Invalid token Type')
    }
}

function validateTokenIssuer(issuer){
    if(issuer != process.env.PDND_ISSUER){
        console.warn('Validation error: Invalid token Issuer')
        throw new ValidationException('Invalid token Issuer') 
    }
}
