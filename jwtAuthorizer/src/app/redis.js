const { RedisHandler } = require("pn-auth-common");

const REDIS_JTI_PREFIX = "pn-session:";

/** 
 * @param {string} jti - The JWT ID to check for revocation.
 * @returns {Promise<boolean>} - Returns true if the JTI is revoked, false otherwise.
 */
const isJtiRevoked = async (jti) => {
  try {
    await RedisHandler.connectRedis();
    const isRevoked = await RedisHandler.get(`${REDIS_JTI_PREFIX}${jti}`);
    return !!isRevoked;
  } catch (error) {
    console.error("Error checking JTI revocation:", error);
    return false;
  } finally {
    await RedisHandler.disconnectRedis();
  }
};

module.exports = {
  isJtiRevoked,
};
