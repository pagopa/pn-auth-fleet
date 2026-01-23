
function buildSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Lambda-Name': 'lollipop-dummy-service'
        },
        body: JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            data: data
        })
    };
}

function buildErrorResponse(errorMessage, statusCode = 500) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Lambda-Name': 'lollipop-dummy-service'
        },
        body: JSON.stringify({
            success: false,
            timestamp: new Date().toISOString(),
            error: {
                message: errorMessage,
                statusCode: statusCode
            }
        })
    };
}

function buildUnauthorizedResponse(message = "Unauthorized") {
    return buildErrorResponse(message, 401);
}

function buildBadRequestResponse(message = "Bad Request") {
    return buildErrorResponse(message, 400);
}

module.exports = {
    buildSuccessResponse,
    buildErrorResponse,
    buildUnauthorizedResponse,
    buildBadRequestResponse
};
