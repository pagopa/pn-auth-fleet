import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { OneIdentityAwsSecretObject } from "../models/Aws";
import { RequestEventBody } from "../models/Event";
import { TokenExchangeResponse } from "../models/Token";
import { ValidationException } from "./exception/validationException";
import { auditLog } from "./utils/AuditLog";
import { getAWSSecret } from "./utils/AwsParameters";
import { exchangeOneIdentityCode } from "./utils/OneIdentity";
import {
  generateKoResponse,
  generateOkResponse,
  generateTokenExchangeResponse,
} from "./utils/Responses";
import { makeLower, retrieveEnvVariable } from "./utils/String";
import { generateSourceObject } from "./utils/TokenGenerator";
import { isOriginAllowed } from "./validation/Origin";
import { validateOneIdentityIdToken } from "./validation/TokenValidation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  event.headers = makeLower(event.headers);

  const eventOrigin = event.headers?.origin;
  let oidcCode: string | undefined;
  let redirectUri: string | undefined;
  let nonce: string | undefined;
  let state: string | undefined;
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
      message: `Origin: ${eventOrigin} is not allowed`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse("Origin not allowed", eventOrigin);
  }

  try {
    if (!event.body) {
      throw new Error("Missing request body");
    }
    const requestBody: RequestEventBody = JSON.parse(event.body);
    oidcCode = requestBody?.code;
    redirectUri = requestBody?.redirect_uri;
    nonce = requestBody?.nonce;
    state = requestBody?.state;
    source = requestBody?.source;

    if (!oidcCode || !redirectUri || !nonce || !state) {
      return generateKoResponse(
        "Missing required parameters in body",
        eventOrigin,
      );
    }
  } catch (err: any) {
    auditLog({
      message: `Error during body parsing: ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse(err, eventOrigin);
  }

  try {
    const oneIdentitySecretName = retrieveEnvVariable(
      "ONE_IDENTITY_SECRET_NAME",
    );

    const oneIdentityCredentials =
      await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

    const oneIdentityToken = await exchangeOneIdentityCode({
      code: oidcCode,
      redirectUri,
      oneIdentityCredentials,
    });

    const decodedIdToken = await validateOneIdentityIdToken({
      oneIdentityIdToken: oneIdentityToken.id_token,
      nonce,
      oneIdentityClientId: oneIdentityCredentials.oneIdentityClientId,
    });

    const sourceResponse = await generateSourceObject(source);

    const response = await generateTokenExchangeResponse({
      decodedIdToken,
      state,
      source: sourceResponse,
    });

    auditLog({
      message: `Token successful generated with id: ${state}`,
      aud_orig: eventOrigin,
      status: "OK",
      cx_type: "PF",
      cx_id: `PF-${decodedIdToken.pairwise}`,
      uid: decodedIdToken.pairwise,
      jti: state,
    }).info("success");

    return generateOkResponse<TokenExchangeResponse>(response, eventOrigin);
  } catch (err: any) {
    const log = auditLog({
      message: `Error generating token: ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    });

    if (err instanceof ValidationException) {
      log.warn("error");
    } else {
      log.error("error");
    }
    return generateKoResponse(err, eventOrigin);
  }
};
