const jsonwebtoken = require("jsonwebtoken");
const { insertJti } = require("./redis");
const { LOG_AUT_TYPE } = require("./constants");
const { getCxType, getCxId, getCxRole, getParameterFromStore } = require("./utils");
const { auditLog } = require("./log");

let whitelist;

const commonRepsonse = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },
  isBase64Encoded: false,
};

const isJtiWhitelisted = async (jti) => {
  if (!Array.isArray(whitelist)) {
    try {
      const list = await getParameterFromStore(process.env.REDIS_JTI_WHITELIST_PARAMETER);
      whitelist = typeof list === "string" ? list.split(",") : Array.isArray(list) ? list : [];
    } catch (error) {
      console.error("Error fetching whitelist from store:", error);
      whitelist = [];
    }
  }
  return whitelist.includes(jti);
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
    const jtiWhitelisted = await isJtiWhitelisted(jti);

    if (!jtiWhitelisted) {
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
    }

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
