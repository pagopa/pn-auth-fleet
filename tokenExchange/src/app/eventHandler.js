const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
const ValidationException = require('./exception/validationException.js');
const bunyan = require("bunyan");

module.exports = {
    async handleEvent(event){
        let eventOrigin = event?.headers?.origin
        if ( eventOrigin ) {
            const traceId = process.env._X_AMZN_TRACE_ID
            const auditLog = bunyan.createLogger({
                name: 'AUD_ACC_LOGIN',
                message: '[AUD_ACC_LOGIN] - LOGIN',
                aud_type: 'AUD_ACC_LOGIN',
                aud_orig: eventOrigin,
                level: 'INFO',
                logger_name: 'bunyan',
                trace_id: traceId
            });
            if ( checkOrigin( eventOrigin ) !== -1 ){
                console.info('Origin successful checked')
                let encodedToken = event?.queryStringParameters?.authorizationToken;
                if (encodedToken) {
                    try{
                        let decodedToken = await validator.validation(encodedToken);
                        let sessionToken = await tokenGen.generateToken(decodedToken);
                        const auditLogTokenSuccess = bunyan.createLogger({
                            name: 'AUD_ACC_LOGIN',
                            message: '[AUD_ACC_LOGIN] - SUCCESS - OK Token successful generated',
                            aud_type: 'AUD_ACC_LOGIN',
                            aud_orig: eventOrigin,
                            level: 'INFO',
                            logger_name: 'bunyan',
                            encodedToken: encodedToken,
                            trace_id: traceId
                        });
                        auditLogTokenSuccess.info('Token successful generated');
                        return generateOkResponse(sessionToken, decodedToken, eventOrigin);
                    } catch (err){
                        const auditLogTokenError = bunyan.createLogger({
                            name: 'AUD_ACC_LOGIN',
                            message: 'AUD_ACC_LOGIN - ERROR - KO Error generating token ' + err.message,
                            aud_type: 'AUD_ACC_LOGIN',
                            aud_orig: eventOrigin,
                            level: 'INFO',
                            logger_name: 'bunyan',
                            trace_id: traceId
                        });
                        auditLogTokenError.error('Error generating token');
                        return generateKoResponse(err, eventOrigin);
                    }
                } else {
                    auditLog.error('Authorization Token not present');
                    return generateKoResponse('AuthorizationToken not present', eventOrigin);
                }
            } else {
                auditLog.error("Origin=%s not allowed", eventOrigin);
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
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };
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
    
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };
}
