const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
const ValidationException = require('./exception/validationException.js');
const auditLog = require("./log.js");

module.exports = {
    async handleEvent(event){
        const eventOrigin = event?.headers?.origin;
        if (eventOrigin) {
            auditLog('', 'AUD_ACC_LOGIN', eventOrigin).info('info');
            if (checkOrigin( eventOrigin ) !== -1) {
                console.info('Origin successful checked');
                // retrieve token
                const httpMethod = event?.httpMethod;
                let encodedToken;                    
                if (httpMethod === 'POST') {
                    try {
                        const requestBody = JSON.parse(event?.body);
                        encodedToken = requestBody?.authorizationToken;
                    } catch (err) {
                        auditLog(`Error generating token ${err.message}`,'AUD_ACC_LOGIN', eventOrigin, 'KO').error("error");
                        return generateKoResponse(err, eventOrigin);
                    }
                } else {
                    encodedToken = event?.queryStringParameters?.authorizationToken;
                }
                if (encodedToken) {
                    try {
                        const decodedToken = await validator.validation(encodedToken);
                        auditLog(`Input token ID: ${decodedToken.jti}`, 'AUD_ACC_LOGIN', eventOrigin, 'OK').info('info');
                        const sessionToken = await tokenGen.generateToken(decodedToken);
                        const uid = decodedToken.uid;
                        const cx_id = decodedToken.organization ? decodedToken.organization.id : ('PF-' + decodedToken.uid);
                        const cx_type = decodedToken.organization ? 'PA' : 'PF';
                        const cx_role = decodedToken.organization?.roles[0]?.role
                        auditLog('Token successful generated', 'AUD_ACC_LOGIN', eventOrigin, 'OK', cx_type, cx_id, cx_role, uid).info('success');
                        auditLog(`Generated token ID: ${decodedToken.jti}`, 'AUD_ACC_LOGIN', eventOrigin, 'OK').info('info');
                        return generateOkResponse(sessionToken, decodedToken, eventOrigin);
                    } catch (err) {
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

function checkOrigin(origin) {
    const allowedOrigins = process.env.ALLOWED_ORIGIN.split( ',' )
    if (allowedOrigins != 0) {
        return allowedOrigins.indexOf( origin )
    } else {
        console.error( 'Invalid env vars ALLOWED_ORIGIN ', process.env.ALLOWED_ORIGIN )
        return -1;
    }
}

function generateOkResponse(sessionToken, decodedToken, allowedOrigin) {
    // Clone decodedToken information and add sessionToken to them
    let responseBody = { ...decodedToken, sessionToken }
    
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
    console.debug('GenerateKoResponse this err', err);
    
    let statusCode;
    let responseBody = {};
    const traceId = process.env._X_AMZN_TRACE_ID;
    
    if (err instanceof ValidationException) {
        if (err.message === 'Role not allowed') {
            statusCode = 403;
        } else {
            statusCode = 400;
        }
        responseBody.error = err.message;
    } else {
        statusCode = 500;
        responseBody.error = err;
    }

    responseBody.status = statusCode;
    responseBody.traceId = traceId;

    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': allowedOrigin
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };
}
