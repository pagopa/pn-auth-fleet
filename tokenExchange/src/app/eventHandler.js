const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
var ValidationException = require('./exception/validationException.js');
const allowedOrigin = process.env.ALLOWED_ORIGIN

module.exports = {
    async handleEvent(event){
        try{
            let decodedToken = await validator.validation(event);
            
            let sessionToken = await tokenGen.generateToken(decodedToken);
            
            return generateOkResponse(sessionToken, decodedToken);
        }catch(err){
            console.error('Error ', err);
            return generateKoResponse(err);
        }
    }
}

function generateOkResponse(sessionToken, decodedToken) {
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

function generateKoResponse(err) {
    console.debug('GenerateKoResponse err',err);

    let statusCode;
    let responseBody = {};

    if (err instanceof ValidationException) {
        statusCode = 400;
        responseBody.error = err.message;
    } else {
        statusCode = 500;
        responseBody.error = err.message;
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
