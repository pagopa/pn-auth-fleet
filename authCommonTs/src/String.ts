import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { randomUUID } from "node:crypto";

export const SPID_FISCAL_NUMBER_PREFIX = "TINIT-";

/**
 * Converts all header keys to lowercase.
 *
 * @param headers - The headers object to convert
 */
export function makeLower(headers: APIGatewayProxyEventHeaders): APIGatewayProxyEventHeaders {
  const head: APIGatewayProxyEventHeaders = {};
  for (const key in headers) {
    if (headers.hasOwnProperty(key)) {
      head[key.toLowerCase()] = headers[key];
    }
  }

  return head;
}

/**
 * Sanitizes a fiscal number by removing the SPID prefix if present.
 *
 * @param fiscalNumber - The fiscal number to sanitize
 */
export function removeFiscalNumberPrefix(fiscalNumber: string): string {
  return fiscalNumber.replace(SPID_FISCAL_NUMBER_PREFIX, "");
}

/** UUID for state */
export const generateRandomUniqueString = (): string => randomUUID();

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isValidUUID = (state: string): boolean => UUID_V4_PATTERN.test(state);
