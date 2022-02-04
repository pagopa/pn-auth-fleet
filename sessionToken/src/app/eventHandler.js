const validator = require('./validation.js')
const tokenGen = require('./tokenGen.js')
var ValidationException = require('./exception/validationException.js');

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
    let responseBody = {
        name: decodedToken.name,
        family_name: decodedToken.family_name,
        fiscal_number: decodedToken.fiscal_number,
        organization: {
            id: decodedToken.organization.id,
            role: decodedToken.organization.role,
        },
        sessionToken: sessionToken
    };

    const response = {
        statusCode: 200,
        headers: {
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };

    return response;
}

function generateKoResponse(err) {
    console.debug('GenerateKoResponse err',err);

    let statusCode;
    let responseBody = {
    };

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
        },
        body: JSON.stringify(responseBody),
        isBase64Encoded: false
    };

    return response;
    
}
