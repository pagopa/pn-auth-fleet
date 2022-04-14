const jwkToPem = require('jwk-to-pem');
const retrieverJwks = require('./retrieverJwks.js')
let cachedKeyPemMap = new Map();
const KEY_SEPARATOR='&'

module.exports = {
    async getPublicKey ( issuer, kid ){
        let keyInPemFormat = searchInCache( issuer, kid )
        if ( keyInPemFormat ) {
            console.info( 'Using cached key pem' )
        } else {
            const jwks = await retrieverJwks.getJwks(issuer);
            let jwKey = findKey(jwks, kid);
            console.info('get jwkey: ', jwKey);
            keyInPemFormat = jwkToPem(jwKey);
            console.info('get key in pem format ok ');
            setCachedData(issuer, kid, keyInPemFormat )
        } 
        return keyInPemFormat;
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
