
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

module.exports = {
    async getPublicKey (decodedToken, kid){
        let jwKey = await getJwkByKid(decodedToken.payload.iss, kid);
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

async function getJwkByKid(iss, kid) {
    //TODO: sostituzione url cablato con check iss (vedi SELC-390)
    const jwksendpoint = 'https://uat.selfcare.pagopa.it/.well-known/jwks.json';
    console.debug('jwksendpoint is ', jwksendpoint);

    try{
        let response = await axios.get(jwksendpoint);
        return findKey(response.data, kid);
    }catch(err){
        console.error('Error in get key ', err);
        throw new Error('Error in get pb key');
    }

}