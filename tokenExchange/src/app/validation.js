const jsonwebtoken = require('jsonwebtoken');
const publicKeyGetter = require('./publicKeyGetter.js')
var ValidationException = require('./exception/validationException.js');

module.exports = {
    async validation (event){
        if(event.queryStringParameters != null && event.queryStringParameters.authorizationToken != null){
            const encodedToken = event.queryStringParameters.authorizationToken;
            let decodedToken = await jwtValidator(encodedToken);
            console.info('token is valid');
    
            return decodedToken;    
        }else{
            throw new ValidationException("token is not valid")
        }
    }
}

async function jwtValidator(jwtToken) {
    const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });
    console.debug('Start jwtValidator');

    if(decodedToken != null){
        let kid = decodedToken.header.kid;
        console.debug('kid', kid)

        const keyInPemFormat = await publicKeyGetter.getPublicKey(decodedToken, kid);
        
        try{
            jsonwebtoken.verify(jwtToken, keyInPemFormat)
        }catch(err){
            console.error('Validation error ', err)
            throw new ValidationException(err.message)
        }
        
        console.debug("success!");
        console.debug('payload', decodedToken.payload)
        return decodedToken.payload;
    }else{
        console.error('decoded token is null, token is not valid')
        throw new ValidationException('Token is not valid')
    }
}
