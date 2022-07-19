const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
var ValidationException = require('./exception/validationException.js');
const bunyan = require("bunyan");

module.exports = {
    async handleEvent(event){
        let eventOrigin = event?.headers?.origin
        const bunyan = require('bunyan');
        if ( eventOrigin ) {
            if ( checkOrigin( eventOrigin ) !== -1 ){
                console.info('Origin successful checked')
                let encodedToken = event?.queryStringParameters?.authorizationToken;
                if (encodedToken) {
                    try{
                        let decodedToken = await validator.validation(encodedToken);
                        let sessionToken = await tokenGen.generateToken(decodedToken);
                        const auditLog = bunyan.createLogger({
                            name: 'AUD_ACC_LOGIN',
                            encodedToken: encodedToken,
                            eventOrigin: eventOrigin
                        });
                        auditLog.info('Token successful generated');
                        return generateOkResponse(sessionToken, decodedToken, eventOrigin);
                    } catch (err){
                        const auditLog = bunyan.createLogger({
                            name: 'AUD_ACC_LOGIN',
                            error: err,
                            eventOrigin: eventOrigin
                        });
                        auditLog.error('Error generating token');
                        return generateKoResponse(err, eventOrigin);
                    }
                } else {
                    console.error('Authorization Token not present')
                    return generateKoResponse('AuthorizationToken not present', eventOrigin);
                }
            } else {
                console.error('Origin=%s not allowed', eventOrigin)
                return generateKoResponse('Origin not allowed', eventOrigin);
            }
        } else {
            console.error('eventOrigin is null')
            return generateKoResponse('eventOrigin is null', '*');
        }
        
    }
}

function checkOrigin( origin ) {
    const allowedOrigins = process.env.ALLOWED_ORIGIN.split( ',' )
    if ( allowedOrigins !== 0) {
        return allowedOrigins.indexOf( origin )
    } else {
        console.error( 'Invalid env vars ALLOWED_ORIGIN ', process.env.ALLOWED_ORIGIN )
        return -1;
    }
}

function generateOkResponse(sessionToken, decodedToken, allowedOrigin) {
    // Clone decodedToken information and add sessionToken to them
    let responseBody = { ... decodedToken, sessionToken }
    
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };
    
    return response;
}

function generateKoResponse(err, allowedOrigin) {
    console.debug('GenerateKoResponse err',err);
    
    let statusCode;
    let responseBody = {};
    
    if (err instanceof ValidationException) {
        statusCode = 400;
        responseBody.error = err.message;
    } else {
        statusCode = 500;
        responseBody.error = err;
    }
    
    const response = {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };
    return response;
}
