const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
var ValidationException = require('./exception/validationException.js');
const allowedOrigins = process.env.ALLOWED_ORIGIN.split( ',' )

module.exports = {
    async handleEvent(event){
        let eventOrigin = event.headers.origin
        if ( checkOrigin( eventOrigin ) ){
            let encodedToken = event.queryStringParameters.authorizationToken;
            if (encodedToken) {
                try{
                    let decodedToken = await validator.validation(encodedToken);
                    let sessionToken = await tokenGen.generateToken(decodedToken);
                    return generateOkResponse(sessionToken, decodedToken, eventOrigin);
                }catch(err){
                    console.error('Error ', err);
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
    }
}

function checkOrigin( origin ) {
    let result = false;
    allowedOrigins.forEach(element => {
        if (element === origin)
        return result = true;
    });
    return result;
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
