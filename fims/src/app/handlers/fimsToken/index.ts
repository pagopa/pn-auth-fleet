import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { generateRedirectResponse } from "../../utils/Responses";
import { auditLog } from "../../utils/AuditLog";

// TODO: implement the real FIMS token flow (read Redis, call data-vault, issue JWT).
// For now it only returns a 302.
export const fimsTokenHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;

  auditLog({
    message: "fims-token - not implemented yet, returning redirect",
    status: "OK",
    request_id,
  }).info("info");

  return generateRedirectResponse("/");
};
