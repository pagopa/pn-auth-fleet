const jsonwebtoken = require("jsonwebtoken");
const { insertJti } = require("./redis");
const { LOG_AUT_TYPE } = require("./constants");
const { getCxType, getCxId, getCxRole } = require("./utils");
const { auditLog } = require("./log");

const commonRepsonse = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },
  isBase64Encoded: false,
};

const handleEvent = async (event) => {
  const eventOrigin = event?.headers?.origin;

  auditLog("", LOG_AUT_TYPE, eventOrigin).info("info");

  try {
    const decodedToken = getDecodedToken(event);
    if (!decodedToken) {
      throw new Error("Invalid token");
    }

    const { jti, uid } = decodedToken;
    const cx_type = getCxType(decodedToken);
    const cx_id = getCxId(decodedToken);
    const cx_role = getCxRole(decodedToken);

    await insertJti(jti);

    auditLog(
      `Jti ${jti} was successfully inserted in Redis`,
      LOG_AUT_TYPE,
      eventOrigin,
      "OK",
      cx_type,
      cx_id,
      cx_role,
      uid,
      jti
    ).info("success");

    return {
      ...commonRepsonse,
      statusCode: 200,
      body: JSON.stringify({
        message: "Logout successful",
      }),
    };
  } catch (error) {
    auditLog(`Error inserting Jti: ${error.message}`, LOG_AUT_TYPE, eventOrigin, "KO").warn("error");

    return {
      ...commonRepsonse,
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};

const getDecodedToken = (event) => {
  const authorization = event.headers?.authorization || event.headers?.Authorization;
  const token = authorization.replace("Bearer ", "");
  return jsonwebtoken.decode(token);
};

module.exports = {
  handleEvent,
};
