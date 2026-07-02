import { APIGatewayProxyHandler } from "aws-lambda";
import { makeLower } from "pn-auth-common-ts";
import { fimsAuthorizeHandler } from "./handlers/fimsAuthorize";
import { fimsTokenHandler } from "./handlers/fimsToken";
import { fimsExchangeHandler } from "./handlers/fimsExchange";

// NOTE: /authorize and /token are consumed by native apps, so they have NO
// Origin/CORS validation. /exchange is browser-facing (called by the citizen
// frontend), so it validates the Origin and emits CORS headers (like OIDC).
export const handler: APIGatewayProxyHandler = async (event, context) => {
  event.headers = makeLower(event.headers);

  const resource = event.resource;
  if (resource === "/authorize") {
    return fimsAuthorizeHandler(event, context);
  }
  if (resource === "/token") {
    return fimsTokenHandler(event, context);
  }
  if (resource === "/exchange") {
    return fimsExchangeHandler(event, context);
  }

  throw new Error(`Unsupported resource: ${resource}`);
};
