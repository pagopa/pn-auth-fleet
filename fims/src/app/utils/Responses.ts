import { ValidationException, type ErrorResponseBody } from "pn-auth-common-ts";

// FIMS responses do NOT include CORS (Access-Control-*) headers: the endpoints
// are called by native apps, so there is no browser origin to authorize.

export function generateRedirectResponse(location: string) {
  return {
    statusCode: 302,
    headers: {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      Location: location,
    },
    body: "",
    isBase64Encoded: false,
  };
}

export function generateKoResponse(err: ValidationException | string | Error) {
  console.debug("GenerateKoResponse this err", err);

  let statusCode: number;
  const responseBody: ErrorResponseBody = {};
  const traceId = process.env._X_AMZN_TRACE_ID;
  const errorMessage = typeof err === "string" ? err : err.message;

  if (err instanceof ValidationException) {
    statusCode = 400;
  } else {
    statusCode = 500;
  }

  responseBody.error = errorMessage;
  responseBody.status = statusCode;
  responseBody.traceId = traceId;

  return {
    statusCode: statusCode,
    headers: {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}
