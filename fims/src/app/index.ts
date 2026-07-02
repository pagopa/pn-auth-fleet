import { APIGatewayProxyHandler } from "aws-lambda";
import { auditLog } from "./utils/AuditLog";
import { makeLower, ValidationException } from "pn-auth-common-ts";
import { fimsAuthorizeHandler } from "./handlers/fimsAuthorize";
import { fimsTokenHandler } from "./handlers/fimsToken";
import { fimsExchangeHandler } from "./handlers/fimsExchange";
import { isOriginAllowed } from "./utils/Origin";
import { generateKoResponse } from "./utils/Responses";

// NOTE: /authorize and /token are consumed by native apps, so they have NO
// Origin/CORS validation. /exchange is browser-facing (called by the citizen
// frontend), so it validates the Origin and emits CORS headers (like OIDC).
export const handler: APIGatewayProxyHandler = async (event, context) => {
  const request_id = context.awsRequestId;
  event.headers = makeLower(event.headers);

  auditLog({ request_id }).info("info");

  const resource = event.resource;
  if (resource === "/authorize") {
    return fimsAuthorizeHandler(event, context);
  }
  if (resource === "/token") {
    return fimsTokenHandler(event, context);
  }
  if (resource === "/exchange") {
    const eventOrigin = event.headers?.origin;
    if (!eventOrigin) {
      return generateKoResponse(new ValidationException("eventOrigin is null"), "*");
    }
    if (!isOriginAllowed(eventOrigin)) {
      return generateKoResponse(new ValidationException("Origin not allowed"), eventOrigin);
    }
    return fimsExchangeHandler(event, context, eventOrigin);
  }

  throw new Error(`Unsupported resource: ${resource}`);
};
