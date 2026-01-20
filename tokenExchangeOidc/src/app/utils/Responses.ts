import { ErrorResponseBody } from "../../models/Responses";
import { Source } from "../../models/Source";
import { OIDecodedIdToken, TokenExchangeResponse } from "../../models/Token";
import { ValidationException } from "../exception/validationException";
import { generateJwtPayload, generateSessionToken } from "./TokenGenerator";

interface GenerateTokenResponseProps {
  decodedIdToken: OIDecodedIdToken;
  state: string;
  source?: Source;
}

/**
 * Generate a token exchange response compatible with SEND
 *
 * @param decodedIdToken - One Identity ID token decoded
 * @param state - The state from request body
 */
export const generateTokenExchangeResponse = async ({
  decodedIdToken,
  state,
  source,
}: GenerateTokenResponseProps): Promise<TokenExchangeResponse> => {
  const tokenPayload = generateJwtPayload({
    pairwise: decodedIdToken.pairwise,
    state,
  });
  const sessionToken = await generateSessionToken(tokenPayload);

  return {
    sessionToken,
    name: decodedIdToken.name,
    family_name: decodedIdToken.familyName,
    uid: decodedIdToken.pairwise,
    fiscal_number: decodedIdToken.fiscalNumber,
    from_aa: false,
    level: "L2",
    aud: tokenPayload.aud,
    iat: tokenPayload.iat,
    exp: tokenPayload.exp,
    iss: tokenPayload.iss,
    jti: state,
    source,
  };
};

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
