import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ValidationException } from "./exception/validationException";
import { auditLog } from "./utils/AuditLog";
import { generateKoResponse } from "./utils/Responses";
import { makeLower } from "./utils/String";
import { isOriginAllowed } from "./validation/Origin";
import { jwtValidator } from "./validation/TokenValidation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  event.headers = makeLower(event.headers);

  const eventOrigin = event.headers?.origin;
  let oidcCode: string | undefined;
  let requestUri: string | undefined;
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
    oidcCode = requestBody?.code;
    requestUri = requestBody?.request_uri;
    source = requestBody?.source;
  } catch (err: any) {
    auditLog({
      message: `Error generating token ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse(err, eventOrigin);
  }

  if (!requestUri) {
    auditLog({
      message: "One Identity Code not present",
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse("One Identity Code not present", eventOrigin);
  }

  try {
    // const decodedToken = await jwtValidator(encodedToken);
    // TODO - 1- Chiamare l'API per ottenere il Token POST https://uat.oneid.pagopa.it/oidc/token
    // TODO - 2 - Validare il token ricevuto (idToken) con JWKS presa da https://uat.oneid.pagopa.it/oidc/keys
    // TODO - 3 - Decodificare idToken e creare il session token (sessionToken)
    // TODO - 4 - Aggiungere le informazioni del source
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
