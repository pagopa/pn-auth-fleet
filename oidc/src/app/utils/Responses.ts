import { ValidationException, type ErrorResponseBody } from "pn-auth-common-ts";

export function generateOkResponse<T>(response: T, allowedOrigin: string) {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(response),
    isBase64Encoded: false,
  };
}

export function generateKoResponse(
  err: ValidationException | string | Error,
  allowedOrigin: string,
) {
  let statusCode: number;
  const responseBody: ErrorResponseBody = {};
  const traceId = process.env._X_AMZN_TRACE_ID;
  const statusMap: Record<string, number> = {
    "Role not allowed": 403,
    "TaxId not allowed": 451,
  };
  const errorMessage = typeof err === "string" ? err : err.message;

  console.debug("GenerateKoResponse this err: %s", errorMessage);

  if (err instanceof ValidationException) {
    statusCode = statusMap[errorMessage] ?? 400;
  } else {
    statusCode = 500;
  }

  responseBody.error = errorMessage;
  responseBody.status = statusCode;
  responseBody.traceId = traceId;

  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}

export function generateRedirectResponse(location: string, allowedOrigin: string) {
  return {
    statusCode: 302,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Expose-Headers": "Location",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      Location: location,
    },
    body: "",
  };
}
