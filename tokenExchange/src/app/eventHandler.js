const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
var ValidationException = require('./exception/validationException.js');
const auditLog = require("./log.js");

module.exports = {
    async handleEvent(event){
        let eventOrigin = event?.headers?.origin
        if ( eventOrigin ) {
            auditLog('', 'AUD_ACC_LOGIN', eventOrigin).info('info');
            if ( checkOrigin( eventOrigin ) !== -1 ){
                console.info('Origin successful checked')
                let encodedToken = event?.queryStringParameters?.authorizationToken;
                if (encodedToken) {
                    try{
                        let decodedToken = await validator.validation(encodedToken);
                        let sessionToken = await tokenGen.generateToken(decodedToken);
                        let uid = decodedToken.uid;
                        let cx_id = decodedToken.organization? decodedToken.organization.id : ('PF-' + decodedToken.uid);
                        let cx_type = decodedToken.organization? 'PA' : 'PF';
                        auditLog('Token successful generated', 'AUD_ACC_LOGIN', eventOrigin, 'OK', cx_type, cx_id, uid).info('success');
                        return generateOkResponse(sessionToken, decodedToken, eventOrigin);
                    } catch (err){
                        auditLog(`Error generating token ${err.message}`,'AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                        return generateKoResponse(err, eventOrigin);
                    }
                } else {
                    auditLog('Authorization Token not present','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                    return generateKoResponse('AuthorizationToken not present', eventOrigin);
                }
            } else {
                auditLog('Origin not allowed','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                return generateKoResponse('Origin not allowed', eventOrigin);
            }
        } else {
            auditLog('eventOrigin is null','AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
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
