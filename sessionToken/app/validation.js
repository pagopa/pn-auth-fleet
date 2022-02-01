const jsonwebtoken = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
var ValidationException = require('../exception/validationException.js');

module.exports = {
    async validation (event){
        console.log('Received event:', JSON.stringify(event, null, 2));

        const encodedToken = event.authorizationToken;
        console.log('encodedToken', encodedToken);
        let decodedToken = await jwtValidator(encodedToken);
        console.log('decodedToken', decodedToken);

        return decodedToken;    
    }
}

function jwtValidator(jwtToken) {
    const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token', decodedToken)

    if(decodedToken != null){
        let kid = decodedToken.header.kid;
        console.log('kid', kid)
        
        return getJwkByKid(decodedToken.payload.iss, kid).then((jwKey) => {
            console.log('jwKey ', jwKey);
            const keyInPemFormat = jwkToPem(jwKey);
            console.log('pem ',keyInPemFormat);
            try{
                jsonwebtoken.verify(jwtToken, keyInPemFormat)
            }catch(err){
                console.log('Validation error ', err)
                throw new ValidationException(err.message)
            }
            
            console.log("success!");
            return decodedToken.payload;
        })
    }else{
        throw new ValidationException('Token is not valid')
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

function getJwkByKid(iss, kid) {
    //TODO: sostituzione url cablato con check iss (vedi SELC-390)
    const jwksendpoint = 'https://uat.selfcare.pagopa.it/.well-known/jwks.json';
    console.log('jwksendpoint', jwksendpoint);
    return axios.get(jwksendpoint).then(
        function(response) {
            return findKey(response.data, kid)
        },
        function(error) { throw error; }
    )
}