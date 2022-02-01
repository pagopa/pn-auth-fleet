const jsonwebtoken = require('jsonwebtoken');
const publicKeyGetter = require('./publicKeyGetter.js')
var ValidationException = require('./exception/validationException.js');

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

async function jwtValidator(jwtToken) {
    const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });
    console.log('token', decodedToken)

    if(decodedToken != null){
        let kid = decodedToken.header.kid;
        console.log('kid', kid)

        const keyInPemFormat = await publicKeyGetter.getPublicKey(decodedToken, kid);
        console.log('public key ', keyInPemFormat);
        
        try{
            jsonwebtoken.verify(jwtToken, keyInPemFormat)
        }catch(err){
            console.log('Validation error ', err)
            throw new ValidationException(err.message)
        }
        
        console.log("success!");
        return decodedToken.payload;
    }else{
        throw new ValidationException('Token is not valid')
    }
}
