
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

module.exports = {
    async getPublicKey (decodedToken, kid){
        let jwKey = await getJwkByKid(decodedToken.payload.iss, kid);
        console.log('jwKey ', jwKey);
        const keyInPemFormat = jwkToPem(jwKey);
        console.log('pem ', keyInPemFormat);
        return keyInPemFormat;
    }
}

function findKey(jwks, kid) {
    console.log(jwks);
    for (let index = 0; index < jwks.keys.length; index++) {
        const key = jwks.keys[index];
        console.log('keyID', key.kid, key.kid === kid);
        if (key.kid === kid) {
            console.log('Found key', key.kid);
            return key;
        }
    }
}

async function getJwkByKid(iss, kid) {
    //TODO: sostituzione url cablato con check iss (vedi SELC-390)
    const jwksendpoint = 'https://uat.selfcare.pagopa.it/.well-known/jwks.json';
    console.log('jwksendpoint', jwksendpoint);

    let response = await axios.get(jwksendpoint);
    return findKey(response.data, kid);
}