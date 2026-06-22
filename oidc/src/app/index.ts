import { APIGatewayProxyHandler } from "aws-lambda";
import { auditLog } from "./utils/AuditLog";
import { isOriginAllowed } from "./utils/Origin";
import { generateKoResponse } from "./utils/Responses";
import { makeLower } from "./utils/String";
import { oidcAuthorizeHandler } from "./handlers/oidcAuthorize";
import { oidcTokenHandler } from "./handlers/oidcToken";

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const request_id = context.awsRequestId;
  event.headers = makeLower(event.headers);

  const eventOrigin = event.headers?.origin;

  if (!eventOrigin) {
    auditLog({
      message: "eventOrigin is null",
      aud_orig: eventOrigin,
      status: "KO",
      request_id,
    }).warn("error");
    return generateKoResponse("eventOrigin is null", "*");
  }

  auditLog({ aud_orig: eventOrigin, request_id }).info("info");

  if (!isOriginAllowed(eventOrigin)) {
    auditLog({
      message: `Origin: ${eventOrigin} is not allowed`,
      aud_orig: eventOrigin,
      status: "KO",
      request_id,
    }).warn("error");
    return generateKoResponse("Origin not allowed", eventOrigin);
  }

  const resource = event.resource;
  if (resource === "/oidc-authorize") {
    return oidcAuthorizeHandler(event, context);
  }
  if (resource === "/oidc-token") {
    return oidcTokenHandler(event, context);
  }

  throw new Error(`Unsupported resource: ${resource}`);
};
