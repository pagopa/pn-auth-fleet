import { ErrorResponseBody } from "../../models/Responses";
import { ValidationException } from "../exception/validationException";

export function generateKoResponse(
  err: ValidationException | string,
  allowedOrigin: string
) {
  console.debug("GenerateKoResponse this err", err);

  let statusCode: number;
  const responseBody: ErrorResponseBody = {};
  const traceId = process.env._X_AMZN_TRACE_ID;
  const statusMap: Record<string, number> = {
    "Role not allowed": 403,
    "TaxId not allowed": 451,
  };

  if (err instanceof ValidationException) {
    statusCode = statusMap[err.message] ?? 400;
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
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
}
