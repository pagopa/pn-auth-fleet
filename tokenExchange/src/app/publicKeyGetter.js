const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
let cachedKeyPemMap = new Map();
const KEY_SEPARATOR='&'

module.exports = {
    async getPublicKey ( issuer, kid ){
        let keyInPemFormat = searchInCache( issuer, kid )
        if ( keyInPemFormat ) {
            console.info( 'Using cached key pem' )
        } else {
            const jwks = await getJwks(issuer);
            let jwKey = findKey(jwks, kid);
            console.info('get jwkey: ', jwKey);
            keyInPemFormat = jwkToPem(jwKey);
            console.info('get key in pem format ok ');
            setCachedData(issuer, kid, keyInPemFormat )
        } 
        return keyInPemFormat;
    }
}

const issuersUrl = (process.env.JWKS_MAPPING) ? JSON.parse(process.env.JWKS_MAPPING) : {
    'api.selfcare.pagopa.it': 'https://uat.selfcare.pagopa.it/.well-known/jwks.json', //TODO vedi stato issue SELC-390
    'spidhub-test.dev.pn.pagopa.it':'http://spidhub-test.dev.pn.pagopa.it:9090/.well-known/jwks.json',
    'spid-hub-test.dev.pn.pagopa.it':'http://spid-hub-test.dev.pn.pagopa.it:8080/.well-known/jwks.json',
    'spid-hub-test.uat.pn.pagopa.it':'http://spid-hub-test.uat.pn.pagopa.it:8080/.well-known/jwks.json'
}

async function getJwks(issuer) {
    let jwksendpoint = issuersUrl[ issuer ];
    if( !jwksendpoint  ) {
        jwksendpoint = issuer + '/.well-known/jwks.json'
    }
    console.info('jwksendpoint is ', jwksendpoint);
    try {
        let response = await axios.get(jwksendpoint);
        return response.data;
    } catch(err){
        console.error('Error in get key ', err);
        throw new Error('Error in get pub key');
    }
}

function findKey(jwks, kid) {
    console.debug(jwks);
    for (let key of jwks.keys) {
        if (key.kid === kid) {
            console.debug('Found key', key.kid);
            return key;
        }
    }
}

function searchInCache( issuer, kid ) {
    let result = cachedKeyPemMap.get( issuer+KEY_SEPARATOR+kid )
    console.debug( 'Value in cache ', result )
    if ( result && result.expiresOn > Date.now() ) {
        return result.value;
    }else {
        return null
    }
}

const setCachedData = (issuer, kid, val) => {
    console.info( 'Set cached key pem' )
    var key = issuer+KEY_SEPARATOR+kid;
    cachedKeyPemMap.set(key, { expiresOn: Date.now() + process.env.CACHE_TTL * 1000, value: val });
    console.debug( 'cachedKeyPemMap', cachedKeyPemMap )
}
