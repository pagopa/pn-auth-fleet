import { APIGatewayProxyHandler } from "aws-lambda";
import { auditLog } from "./utils/AuditLog";
import { makeLower } from "pn-auth-common-ts";
import { fimsAuthorizeHandler } from "./handlers/fimsAuthorize";
import { fimsTokenHandler } from "./handlers/fimsToken";

// NOTE: FIMS is consumed by native apps, so there is NO Origin/CORS validation
// here (unlike the OIDC lambda).
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

  throw new Error(`Unsupported resource: ${resource}`);
};
