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

async function handleEvent(event, context) {
  const request_id = context?.awsRequestId;
  event.headers = makeLower(event.headers);
  const eventOrigin = event?.headers?.origin;
  if (eventOrigin) {
    auditLog({ aud_type: "AUD_ACC_LOGIN", aud_orig: eventOrigin, request_id }).info("info");
    if (checkOrigin(eventOrigin) !== -1) {
      console.info("Origin successful checked");
      let encodedToken;
      let source;
      try {
        const requestBody = JSON.parse(event?.body);
        encodedToken = requestBody?.authorizationToken;
        source = requestBody?.source;
      } catch (err) {
        auditLog({
          message: `Error generating token ${err.message}`,
          aud_type: "AUD_ACC_LOGIN",
          aud_orig: eventOrigin,
          status: "KO",
          request_id,
        }).warn("error");
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
          auditLog({
            message: `Token successful generated with id ${enrichedToken.jti}`,
            aud_type: "AUD_ACC_LOGIN",
            aud_orig: eventOrigin,
            status: "OK",
            cx_type,
            cx_id,
            cx_role,
            uid,
            jti: enrichedToken.jti,
            request_id,
          }).info("success");
          return generateOkResponse(sessionToken, enrichedToken, eventOrigin);
        } catch (err) {
          const log = auditLog({
            message: `Error generating token ${err.message}`,
            aud_type: "AUD_ACC_LOGIN",
            aud_orig: eventOrigin,
            status: "KO",
            request_id,
          });

          if (err instanceof ValidationException) {
            log.warn("error");
          } else {
            log.error("error");
          }

          return generateKoResponse(err, eventOrigin);
        }
      } else {
        auditLog({
          message: "Authorization Token not present",
          aud_type: "AUD_ACC_LOGIN",
          aud_orig: eventOrigin,
          status: "KO",
          request_id,
        }).warn("error");
        return generateKoResponse(
          "AuthorizationToken not present",
          eventOrigin
        );
      }
    } else {
      auditLog({ message: "Origin not allowed", aud_type: "AUD_ACC_LOGIN", aud_orig: eventOrigin, status: "KO", request_id }).warn("error");
      return generateKoResponse("Origin not allowed", eventOrigin);
    }
  } else {
    auditLog({ message: "eventOrigin is null", aud_type: "AUD_ACC_LOGIN", aud_orig: eventOrigin, status: "KO", request_id }).warn("error");
    return generateKoResponse("eventOrigin is null", "*");
  }
}

module.exports = { handleEvent };
