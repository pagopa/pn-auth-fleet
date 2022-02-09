const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

module.exports = {
    async getPublicKey ( kid ){
        let jwKey = await getJwkByKid( kid );
        console.debug('get jwkey ok');
        const keyInPemFormat = jwkToPem(jwKey);
        console.debug('get key in pem format ok ');
        return keyInPemFormat;
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

async function getJwkByKid( kid ) {
    const iss = process.env.ISSUER
    const jwksendpoint = iss +'/.well-known/jwks.json';
    console.debug('jwksendpoint is ', jwksendpoint);

    try{
        let response = await axios.get(jwksendpoint);
        return findKey(response.data, kid);
    }catch(err){
        console.error('Error in get key ', err);
        throw new Error('Error in get pb key');
    }

}