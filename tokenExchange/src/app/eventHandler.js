import { ValidationException } from "./exception/validationException.js";
import { auditLog } from "./log.js";
import { generateKoResponse, generateOkResponse } from "./responses.js";
import { generateToken } from "./tokenGen.js";
import {
  checkOrigin,
  enrichDecodedToken,
  getUserType,
  makeLower,
} from "./utils.js";
import { validation } from "./validation.js";

const handleEvent = async (event) => {
  event.headers = makeLower(event.headers);
  const eventOrigin = event?.headers?.origin;
  if (eventOrigin) {
    auditLog("", "AUD_ACC_LOGIN", eventOrigin).info("info");
    if (checkOrigin(eventOrigin) !== -1) {
      console.info("Origin successful checked");
      // retrieve token
      let encodedToken;
      try {
        const requestBody = JSON.parse(event?.body);
        encodedToken = requestBody?.authorizationToken;
      } catch (err) {
        auditLog(
          `Error generating token ${err.message}`,
          "AUD_ACC_LOGIN",
          eventOrigin,
          "KO"
        ).warn("error");
        return responses.generateKoResponse(err, eventOrigin);
      }
      if (encodedToken) {
        try {
          const decodedToken = await validation(encodedToken);
          const enrichedToken = enrichDecodedToken(decodedToken);
          const sessionToken = await generateToken(enrichedToken);
          const uid = enrichedToken.uid;
          const cx_id = enrichedToken.organization
            ? enrichedToken.organization.id
            : "PF-" + enrichedToken.uid;
          const cx_type = getUserType(enrichedToken);
          const cx_role = enrichedToken.organization?.roles[0]?.role;
          auditLog(
            `Token successful generated with id ${enrichedToken.jti}`,
            "AUD_ACC_LOGIN",
            eventOrigin,
            "OK",
            cx_type,
            cx_id,
            cx_role,
            uid,
            enrichedToken.jti
          ).info("success");
          return generateOkResponse(sessionToken, enrichedToken, eventOrigin);
        } catch (err) {
          let log = auditLog(
            `Error generating token ${err.message}`,
            "AUD_ACC_LOGIN",
            eventOrigin,
            "KO"
          );

          if (err instanceof ValidationException) {
            log.warn("error");
          } else {
            log.error("error");
          }

          return generateKoResponse(err, eventOrigin);
        }
      } else {
        auditLog(
          "Authorization Token not present",
          "AUD_ACC_LOGIN",
          eventOrigin,
          "KO"
        ).warn("error");
        return generateKoResponse(
          "AuthorizationToken not present",
          eventOrigin
        );
      }
    } else {
      auditLog("Origin not allowed", "AUD_ACC_LOGIN", eventOrigin, "KO").warn(
        "error"
      );
      return generateKoResponse("Origin not allowed", eventOrigin);
    }
  } else {
    auditLog("eventOrigin is null", "AUD_ACC_LOGIN", eventOrigin, "KO").warn(
      "error"
    );
    return generateKoResponse("eventOrigin is null", "*");
  }
};

export { handleEvent };
