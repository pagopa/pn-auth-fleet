const ValidationException = require("./exception/validationException");

function generateOkResponse(sessionToken, decodedToken, allowedOrigin) {
  // Clone decodedToken information and add sessionToken to them
  const responseBody = { ...decodedToken, sessionToken };
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}

function generateKoResponse(err, allowedOrigin) {
  console.debug("GenerateKoResponse this err", err);

  let statusCode;
  const responseBody = {};
  const traceId = process.env._X_AMZN_TRACE_ID;

  if (err instanceof ValidationException) {
    if (err.message === "Role not allowed") {
      statusCode = 403;
    } else if (err.message === "TaxId not allowed") {
      statusCode = 451;
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
      "Access-Control-Allow-Origin": allowedOrigin,
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}
module.exports = { generateKoResponse, generateOkResponse };
