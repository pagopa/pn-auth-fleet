import { ValidationException, type ErrorResponseBody } from "pn-auth-common-ts";

// The /authorize and /token endpoints are called by native apps, so they do NOT
// include CORS headers. The /exchange endpoint is browser-facing, so it passes an
// `allowedOrigin` to emit the Access-Control-Allow-Origin header.

const HSTS = "max-age=31536000; includeSubDomains; preload";

// Builds the base response headers, adding the CORS origin header only when an
// allowed origin is provided (i.e. for the browser-facing /exchange endpoint).
function buildHeaders(allowedOrigin?: string): Record<string, string> {
  const headers: Record<string, string> = { "Strict-Transport-Security": HSTS };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }
  return headers;
}

export function generateRedirectResponse(location: string) {
  return {
    statusCode: 302,
    headers: {
      "Strict-Transport-Security": HSTS,
      Location: location,
    },
    body: "",
    isBase64Encoded: false,
  };
}

export function generateOkResponse<T>(response: T, allowedOrigin: string) {
  return {
    statusCode: 200,
    headers: buildHeaders(allowedOrigin),
    body: JSON.stringify(response),
    isBase64Encoded: false,
  };
}

export function generateKoResponse(
  err: ValidationException | string | Error,
  allowedOrigin?: string,
) {
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
    headers: buildHeaders(allowedOrigin),
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}
