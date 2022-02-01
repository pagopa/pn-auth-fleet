const validator = require('./app/validation.js')
const tokenGen = require('./app/tokenGen.js')
var ValidationException = require('./exception/validationException.js');

exports.handler = async (event) => {
    console.log("New event received ", event);

    try{
        let decodedToken = await validator.validation(event);
    
        let sessionToken = await tokenGen.generateToken(decodedToken);

        return generateOkResponse(sessionToken);
    }catch(err){
        return generateKoResponse(err);
    }
};

function generateOkResponse(sessionToken) {
    let body = {
        sessionToken: sessionToken
    };

    return {
        statusCode: 200,
        body: body,
    };
}

function generateKoResponse(err) {
    console.log('GenerateKoResponse err',err);

    let statusCode;
    let body;

    if (err instanceof ValidationException) {
        statusCode = 400;
        body = err.message;
    } else {
        statusCode = 500;
        body = err.message;
    }
    return {
        statusCode: statusCode,
        body: body,
    };
}
