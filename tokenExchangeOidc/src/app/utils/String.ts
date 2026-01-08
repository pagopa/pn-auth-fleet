import { APIGatewayProxyEventHeaders } from "aws-lambda";

export function makeLower(
  headers: APIGatewayProxyEventHeaders
): APIGatewayProxyEventHeaders {
  const head: APIGatewayProxyEventHeaders = {};
  for (const key in headers) {
    if (headers.hasOwnProperty(key)) {
      head[key.toLowerCase()] = headers[key];
    }
  }

  return head;
}

export function maskString(stringToMask: string): string {
  if (stringToMask.length < 6) {
    return "".padStart(stringToMask.length, "*");
  }

  const firstTwoChars = stringToMask.substring(0, 2);
  const lastTwoChars = stringToMask.substring(stringToMask.length - 2);
  const hiddenStringLength = stringToMask.length - 4;
  const hiddenString = "".padStart(hiddenStringLength, "*");

  return firstTwoChars + hiddenString + lastTwoChars;
}
