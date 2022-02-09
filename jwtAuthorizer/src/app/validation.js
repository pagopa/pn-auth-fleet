const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');
const jsonwebtoken = require('jsonwebtoken');
const fs = require('fs');
var ValidationException = require('./exception/validationException.js');

module.exports = {
    async validation (jwtToken){
        if(jwtToken){
            let decodedToken = await jwtValidator(jwtToken);
            console.info('token is valid');
            return decodedToken;    
        }else{
            throw new ValidationException("token is not valid")
        }
    }
}


async function jwtValidator(jwtToken) {
    const token = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token', token)
    
    const publicKey = fs.readFileSync("./src/test/pkey.pem", { encoding: "utf8" }); //TODO Valutare se lasciare la Public Key in file interna al progetto
    
    try{
        jsonwebtoken.verify(jwtToken, publicKey)
    }catch(err){
        console.error('Validation error ', err)
        throw new ValidationException(err.message)
    }

    console.log("success!");
    return token.payload;
    
}