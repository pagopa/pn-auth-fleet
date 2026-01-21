const {buildSuccessResponse, buildErrorResponse} = require('./responseBuilder');
const {extractLollipopHeaders, maskSensitiveHeaders} = require('./headerExtractor');

async function handleEvent(event) {
    try {
        console.info("Processing Event...")
        const headers = event.headers || {};
        const authorizerContext = event.requestContext?.authorizer || null;
        const httpMethod = event.httpMethod;
        const path = event.path;
        const requestTime = event.requestContext?.requestTime;
        const queryParams = event.queryStringParameters || {};
        const body = event.body;
        const lollipopHeaders = extractLollipopHeaders(headers);

        if (body) {
            try {
                const parsedBody = JSON.parse(body);
                console.info("Request body received:", {
                    bodyLength: body.length,
                    bodyKeys: Object.keys(parsedBody),
                    body: JSON.stringify(parsedBody)
                });
            } catch (error) {
                console.info("Error parsing body:", {
                    bodyLength: body.length,
                    body: body
                })
            }
        } else {
            console.info("No Request body.")
        }

        if (authorizerContext) {
            console.info("Authorizer context received:", {
                userId: authorizerContext.userId || null,
                name: authorizerContext.name || null,
                familyName: authorizerContext.familyName || null,
                allContextKeys: Object.keys(authorizerContext)
            });
        } else {
            console.info("No authorizer context received.")
        }

        const maskedHeaders = maskSensitiveHeaders(event.headers);
        console.info("Request info summary:", {
            method: httpMethod,
            path: path,
            hasAuthContext: !!authorizerContext,
            hasBody: !!body,
            lollipopHeadersCount: Object.keys(lollipopHeaders).length,
            headers: maskedHeaders
        });

        const responseData = {
            message: "Request processed successfully",
            timestamp: new Date().toISOString(),
            request: {
                method: httpMethod,
                path: path,
                requestTime: requestTime,
                queryParameters: queryParams,
                hasBody: !!body,
                bodyLength: body ? body.length : 0
            },
            requestBody: body ? (function () {
                try {
                    return JSON.parse(body);
                } catch (error) {
                    return body;
                }
            })() : null,
            lollipopHeaders: lollipopHeaders,
            authorizerContext, authorizerContext,
            summary: {
                headers:maskedHeaders,
                body:body,
                hasAuthorizerContext: !!authorizerContext,
                authorizerContextKeys: authorizerContext ? Object.keys(authorizerContext) : []
            }
        };

        console.info("Response prepared successfully");
        return buildSuccessResponse(responseData)
    } catch (error) {
        console.error("Error processing event:", error);
        console.error("Error stack:", error.stack);
        return buildErrorResponse(error.message || "Internal server error");
    }
}

module.exports = {handleEvent}