import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { RequestEventBody } from "../models/Event";
import { ValidationException } from "./exception/validationException";
import { auditLog } from "./utils/AuditLog";
import { exchangeOneIdentityCode } from "./utils/OneIdentity";
import { generateKoResponse } from "./utils/Responses";
import { makeLower } from "./utils/String";
import { isOriginAllowed } from "./validation/Origin";
import { validateOneIdentityIdToken } from "./validation/TokenValidation";
import { getAWSSecret } from "./utils/AwsParameters";
import { OneIdentityAwsSecretObject } from "../models/Aws";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  event.headers = makeLower(event.headers);

  const eventOrigin = event.headers?.origin;
  let oidcCode: string | undefined;
  let redirectUri: string | undefined;
  let nonce: string | undefined;
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
      message: "Origin not allowed",
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
    source = requestBody?.source;
  } catch (err: any) {
    auditLog({
      message: `Error generating token ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn("error");
    return generateKoResponse(err, eventOrigin);
  }

  if (!oidcCode || !redirectUri || !nonce) {
    return generateKoResponse(
      "Missing required parameters in body",
      eventOrigin
    );
  }

  try {
    const oneIdentitySecretName = process.env.ONE_IDENTITY_SECRET_NAME;

    if (!oneIdentitySecretName) {
      throw new Error("ONE_IDENTITY_SECRET_NAME is not set");
    }

    const oneIdentityCredentials =
      await getAWSSecret<OneIdentityAwsSecretObject>(oneIdentitySecretName);

    const oneIdentityToken = await exchangeOneIdentityCode(
      oidcCode,
      redirectUri,
      oneIdentityCredentials
    );

    const decodedToken = await validateOneIdentityIdToken(
      oneIdentityToken.id_token,
      nonce,
      oneIdentityCredentials.oneIdentityClientId
    );

    console.log("TMP - Decoded Token:", decodedToken);

    // TODO - 3 - Decodificare idToken e creare il session token (sessionToken)
    // TODO - 4 - Aggiungere le informazioni del source
  } catch (err: any) {
    auditLog({
      message: `Error generating token ${err.message}`,
      aud_orig: eventOrigin,
      status: "KO",
    }).warn(err instanceof ValidationException ? "warn" : "error");
    return generateKoResponse(err, eventOrigin);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from AWS Lambda + TypeScript",
      input: event,
    }),
  };
};
