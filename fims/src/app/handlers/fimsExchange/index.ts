import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { generateKoResponse, generateOkResponse } from "../../utils/Responses";
import { auditLog } from "../../utils/AuditLog";
import { FimsExchangeRequestBody } from "./models/Exchange";
import { validateFimsToken } from "./validation/ExchangeTokenValidation";
import { generateSessionPayload, generateSessionToken } from "./utils/SessionToken";
import {
  buildSessionTokenResponse,
  SessionTokenResponse,
  ValidationException,
} from "pn-auth-common-ts";
import { isOriginAllowed } from "../../utils/Origin";

// Exchanges the short-lived fimsToken (issued by /token, delivered to the
// frontend in the redirect fragment) for a long-lived session token plus the
// citizen info, returning the same response shape as oidc/token.
export const fimsExchangeHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const request_id = context.awsRequestId;
  const eventOrigin = event.headers?.origin;
  if (!eventOrigin) {
    return generateKoResponse(new ValidationException("eventOrigin is null"), "*");
  }
  if (!isOriginAllowed(eventOrigin)) {
    return generateKoResponse(new ValidationException("Origin not allowed"), eventOrigin);
  }

  try {
    const { authorizationToken } = JSON.parse(event.body!) as FimsExchangeRequestBody;

    // 1. Validate the fimsToken (KMS signature + expiry), like jwtAuthorizer.
    const claims = await validateFimsToken(authorizationToken);

    // 2. Sign the long-lived session token (oidc-style payload).
    const sessionPayload = generateSessionPayload({ uid: claims.uid, state: claims.state });
    const sessionToken = await generateSessionToken(sessionPayload);

    auditLog({
      message: "Fims token exchanged for a session token",
      aud_orig: eventOrigin,
      status: "OK",
      cx_type: "PF",
      cx_id: `PF-${claims.uid}`,
      uid: claims.uid,
      jti: claims.state,
      request_id,
    }).info("success");

    // 3. Return the oidc/token-style response (shared builder keeps them aligned).
    const response: SessionTokenResponse = buildSessionTokenResponse({
      sessionToken,
      payload: sessionPayload,
      name: claims.given_name,
      family_name: claims.family_name,
      fiscal_number: claims.fiscal_code,
    });

    consoe.log("fimsExchangeHandler response: ", response);
    return generateOkResponse<SessionTokenResponse>(response, eventOrigin);
  } catch (err) {
    auditLog({
      message: `fims-exchange error: ${(err as Error).message}`,
      status: "KO",
      request_id,
    }).error("error");
    return generateKoResponse(err as Error, eventOrigin);
  }
};
