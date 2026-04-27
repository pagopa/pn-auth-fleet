import { APIGatewayProxyEvent } from "aws-lambda";
import { oidcAuthorizeHandler } from "./handlers/oidcAuthorize";
import { oidcStateHandler } from "./handlers/oidcState";
import { oidcTokenHandler } from "./handlers/oidcToken";

export const handler = async (event: APIGatewayProxyEvent) => {
  const resource = event.resource;
  if (resource === "/oidc-authorize") {
    return oidcAuthorizeHandler(event);
  }
  if (resource === "/oidc-token") {
    return oidcTokenHandler(event);
  }
  if (resource === "/oidc-state") {
    return oidcStateHandler(event);
  }

  throw new Error(`Unsupported resource: ${resource}`);
};
