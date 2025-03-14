const ValidationException = require("./exception/validationException.js");
const { auditLog } = require("./log.js");
const { generateKoResponse, generateOkResponse } = require("./responses.js");
// for testing purpose, we mustn't destructure the import; stub doesn't mock destructured object
const { generateToken } = require("./tokenGen.js");
const {
  checkOrigin,
  enrichDecodedToken,
  getUserType,
  makeLower,
  addSourceChannelInfo
} = require("./utils.js");
const { validation } = require("./validation.js");
const { getRetrievalPayload } = require("./emdIntegrationClient.js");

async function handleEvent(event) {
  event.headers = makeLower(event.headers);
  const eventOrigin = event?.headers?.origin;
  if (eventOrigin) {
    auditLog("", "AUD_ACC_LOGIN", eventOrigin).info("info");
    if (checkOrigin(eventOrigin) !== -1) {
      console.info("Origin successful checked");
      // retrieve token
      let encodedToken;
      let source;
      try {
        const requestBody = JSON.parse(event?.body);
        encodedToken = requestBody?.authorizationToken;
        source = requestBody?.source;
      } catch (err) {
        auditLog(
          `Error generating token ${err.message}`,
          "AUD_ACC_LOGIN",
          eventOrigin,
          "KO"
        ).warn("error");
        return generateKoResponse(err, eventOrigin);
      }
      if (encodedToken) {
        try {
          const decodedToken = await validation(encodedToken);
          let enrichedToken = enrichDecodedToken(decodedToken);
          if(source) {
            console.info("Add source channel info")
            let tppId;
            if (source.type === 'TPP') {
              const retrievalPayload = await getRetrievalPayload(source.id);
              console.info("Retrieval Payload: ", retrievalPayload)
              tppId = retrievalPayload.tppId;
            } 
            enrichedToken = addSourceChannelInfo(enrichedToken, source, tppId);
          }
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
          const log = auditLog(
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
}

module.exports = { handleEvent };
