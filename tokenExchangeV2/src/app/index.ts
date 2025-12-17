import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { isOriginAllowed, makeLower } from "./utils";
import { auditLog } from "./log";
import { generateKoResponse } from "./responses";
import { ValidationException } from "./exception/validationException";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  event.headers = makeLower(event.headers);

  const eventOrigin = event.headers?.origin;
  let encodedToken;
  let source;

  if (!eventOrigin) {
    auditLog({
      message: "eventOrigin is null",
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse("eventOrigin is null", "*");
  }

  auditLog({ aud_orig: eventOrigin }).info("info");

  if (!isOriginAllowed(eventOrigin)) {
    auditLog({
      message: "Origin not allowed",
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse("Origin not allowed", eventOrigin);
  }

  try {
    if (!event.body) {
      throw new Error("Missing request body");
    }
    const requestBody = JSON.parse(event.body);
    encodedToken = requestBody?.authorizationToken;
    source = requestBody?.source;
  } catch (err: any) {
    auditLog({
      message: `Error generating token ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse(err, eventOrigin);
  }

  if (!encodedToken) {
    auditLog({
      message: "Authorization Token not present",
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse("AuthorizationToken not present", eventOrigin);
  }

  try {
    // const decodedToken = await validation(encodedToken);
  } catch (err: any) {
    auditLog({
      message: `Error generating token ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn(err instanceof ValidationException ? "warn" : "error");
    return generateKoResponse(err, eventOrigin);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from AWS Lambda + TypeScript",
      input: event,
    }),
  };
};
