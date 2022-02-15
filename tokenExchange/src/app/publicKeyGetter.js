const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
let cachedKeyPem = {};

module.exports = {
    async getPublicKey ( issuer, kid ){
        let keyInPemFormat
        if ( cachedKeyPem && cachedKeyPem.expiresOn > Date.now() ) {
            console.debug( 'Using cached key pem' )
            keyInPemFormat = cachedKeyPem.value
        } else {
            jwksendpoint = getJwksEndpoint( issuer )
            let jwKey = await getJwkByKid( jwksendpoint, kid );
            console.debug('get jwkey ok');
            keyInPemFormat = jwkToPem(jwKey);
            console.debug('get key in pem format ok ');
            setCachedData( keyInPemFormat )
        } 
        return keyInPemFormat;
    }
}

function getJwksEndpoint( issuer ) {
    let jwksendpoint;
    if( issuer === 'api.selfcare.pagopa.it' ) { //TODO vedi stato issue SELC-390
        jwksendpoint = 'https://uat.selfcare.pagopa.it/.well-known/jwks.json'
    } else {
        jwksendpoint = 'https://'+ issuer + '/.well-known/jwks.json'
    }
    console.debug('jwksendpoint is ', jwksendpoint);
    return jwksendpoint
}

async function getJwkByKid( jwksendpoint, kid ) {
    try{
        let response = await axios.get(jwksendpoint);
        return findKey(response.data, kid);
    }catch(err){
        console.error('Error in get key ', err);
        throw new Error('Error in get pb key');
    }
}

function findKey(jwks, kid) {
    console.debug(jwks);
    for (let index = 0; index < jwks.keys.length; index++) {
        const key = jwks.keys[index];
        if (key.kid === kid) {
            console.debug('Found key', key.kid);
            return key;
        }
    }
}

const setCachedData = (val) => {
    console.debug( 'Set cached key pem' )
    cachedKeyPem = {
        expiresOn: Date.now() + process.env.CACHE_TTL * 1000,
        value: val
    }
}
