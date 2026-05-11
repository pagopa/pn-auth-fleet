import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { ValidationException } from "../../exception/validationException";
import type { OidcStateData } from "../../models/OidcState";
import { getOidcStateRedisKey } from "../../utils/Constants";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { isValidUUID } from "../../utils/String";
import { auditLog } from "../../utils/AuditLog";

export const oidcStateHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;
  const eventOrigin = event.headers.origin!;
  const state = event.queryStringParameters?.state!; // required, validated by API Gateway: method.request.querystring.state

  if (!state || !isValidUUID(state)) {
    return generateKoResponse(new ValidationException("Invalid oidc state parameter"), eventOrigin);
  }

  await RedisHandler.connectRedis();
  try {
    const redisKey = getOidcStateRedisKey(state);
    const stateData = await RedisHandler.getJson<OidcStateData>(redisKey);
    if (!stateData) {
      return generateKoResponse(new ValidationException("Oidc state not found"), eventOrigin);
    }

    auditLog({
      message: `Oidc state retrieved successfully, state: ${state}`,
      aud_orig: eventOrigin,
      status: "OK",
      cx_type: "PF",
      jti: state,
      request_id,
    }).info("success");

    return generateOkResponse(stateData, eventOrigin);
  } finally {
    await RedisHandler.disconnectRedis();
  }
};
