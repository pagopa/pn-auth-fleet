const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
let cachedKeyPemMap = new Map();

module.exports = {
    async getPublicKey ( issuer, kid ){
        let keyInPemFormat = searchInCache( issuer, kid )
        if ( keyInPemFormat ) {
            console.info( 'Using cached key pem' )
        } else {
            jwksendpoint = getJwksEndpoint( issuer )
            let jwKey = await getJwkByKid( jwksendpoint, kid );
            console.info('get jwkey ok');
            keyInPemFormat = jwkToPem(jwKey);
            console.info('get key in pem format ok ');
            setCachedData(issuer, kid, keyInPemFormat )
        } 
        return keyInPemFormat;
    }
}

const issuersUrl = {
    'api.selfcare.pagopa.it': 'https://uat.selfcare.pagopa.it/.well-known/jwks.json', //TODO vedi stato issue SELC-390
    'spidhub-test.dev.pn.pagopa.it':'http://spidhub-test.dev.pn.pagopa.it:9090/.well-known/jwks.json'
}

function getJwksEndpoint( issuer ) {
    let jwksendpoint = issuersUrl[ issuer ];
    if( !jwksendpoint  ) { 
        jwksendpoint = 'https://'+ issuer + '/.well-known/jwks.json'
    }
    console.info('jwksendpoint is ', jwksendpoint);
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

function searchInCache( issuer, kid ) {
    let result = cachedKeyPemMap.get( issuer+kid )
    console.debug( 'Value in cache ', result )
    if ( result && result.expiresOn > Date.now() ) {
        return result.value;
    }else {
        return null
    }
}

const setCachedData = (issuer, kid, val) => {
    console.info( 'Set cached key pem' )
    var key = issuer+kid;
    cachedKeyPemMap.set(key, { expiresOn: Date.now() + process.env.CACHE_TTL * 1000, value: val });
    console.debug( 'cachedKeyPemMap', cachedKeyPemMap )
}
