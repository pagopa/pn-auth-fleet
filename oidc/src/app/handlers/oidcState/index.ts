import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RedisHandler } from "pn-auth-common";
import { ValidationException } from "../../exception/validationException";
import type { OidcStateData } from "../../models/OidcState";
import { getOidcStateRedisKey } from "../../utils/Constants";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { isValidUUID } from "../../utils/String";

export const oidcStateHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    return generateOkResponse(stateData, eventOrigin);
  } finally {
    await RedisHandler.disconnectRedis();
  }
};
