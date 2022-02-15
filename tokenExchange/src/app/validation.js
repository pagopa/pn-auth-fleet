const jsonwebtoken = require('jsonwebtoken');
const publicKeyGetter = require('./publicKeyGetter.js')
var ValidationException = require('./exception/validationException.js');

module.exports = {
    async validation (authorizationToken){
        let decodedTokenPayload = await jwtValidator(authorizationToken);
        console.info('token is valid');
        return decodedTokenPayload;    
    }
}

async function jwtValidator(jwtToken) {
    console.debug('Start jwtValidator');
    const decodedToken = jsonwebtoken.decode(jwtToken, { complete: true });
    
    if( decodedToken ){
        console.debug('decoded_token', decodedToken)
        const tokenPayload = decodedToken.payload
        const issuer = tokenPayload.iss
        
        if ( checkIssuer( issuer ) !== -1 ){
            let kid = decodedToken.header.kid;
            console.debug('kid', kid)
            let keyInPemFormat = await publicKeyGetter.getPublicKey( issuer, kid );
            try{
                jsonwebtoken.verify(jwtToken, keyInPemFormat)
            }catch(err){
                console.error('Validation error ', err)
                throw new ValidationException(err.message)
            }
            console.debug("success!");
            console.debug('payload', tokenPayload)
            return tokenPayload;
        }
        else {
            console.error('Issuer=%s not known', tokenPayload.iss)
            throw new ValidationException('Issuer not known')
        }
    }
    else {
        console.error('decoded token is null, token is not valid')
        throw new ValidationException('Token is not valid')
    }
}

function checkIssuer( iss ) {
    //verifica iss nel decoded token fa parte dei ALLOWED_ISSUER
    let allowedIssuers = process.env.ALLOWED_ISSUER.split( ',' );
    if ( allowedIssuers !== 0) {
        return allowedIssuers.indexOf( iss )
    } else {
        console.error( 'Invalid env vars ALLOWED_ISSUER ', process.env.ALLOWED_ISSUER )
        return -1;
    }
}
