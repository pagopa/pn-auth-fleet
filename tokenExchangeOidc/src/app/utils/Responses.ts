import { ErrorResponseBody } from "../../models/Responses";
import {
  JwtPayload,
  OIDecodedIdToken,
  TokenExchangeResponse,
} from "../../models/Token";
import { ValidationException } from "../exception/validationException";

interface GenerateTokenResponseProps {
  sessionToken: string;
  decodedToken: OIDecodedIdToken;
  payload: JwtPayload;
  state: string;
}

/**
 * Generate a token exchange response compatible with SEND
 *
 * @param sessionToken - The generate Session Token JWT
 * @param decodedToken - One Identity decoded token
 * @param payload - The payload of Session Token
 * @param state - The state from request body
 */
export const generateTokenExchangeResponse = async ({
  sessionToken,
  decodedToken,
  payload,
  state,
}: GenerateTokenResponseProps): Promise<TokenExchangeResponse> => ({
  sessionToken,
  name: decodedToken.name,
  family_name: decodedToken.familyName,
  uid: decodedToken.pairwise,
  fiscal_number: decodedToken.fiscalNumber,
  from_aa: false,
  level: "L2",
  aud: payload.aud,
  iat: payload.iat,
  exp: payload.exp,
  iss: payload.iss,
  jti: state,
});

export function generateOkResponse(
  response: TokenExchangeResponse,
  allowedOrigin: string
) {
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
  const errorMessage = typeof err === "string" ? err : err.message;

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
