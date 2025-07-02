const { RedisHandler, COMMON_CONSTANTS } = require("pn-auth-common");

/** 
 * @param {string} jti - The JWT ID to check for revocation.
 * @returns {Promise<boolean>} - Returns true if the JTI is revoked, false otherwise.
 */
const isJtiRevoked = async (jti) => {
  try {
    await RedisHandler.connectRedis();
    const isRevoked = await RedisHandler.get(`${COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX}${jti}`);
    return !!isRevoked;
  } catch (error) {
    console.error("Error checking JTI revocation:", error);
    return false;
  } finally {
    disconnectRedis();
  }
};

const disconnectRedis = async () => {
  try {
    await RedisHandler.disconnectRedis();
  } catch (error) {
    console.error("Error disconnecting from Redis:", error);
  }
};

module.exports = {
  isJtiRevoked,
};
