const { RedisHandler } = require('pn-auth-common');
const { REDIS_JTI_EXP, REDIS_JTI_PREFIX } = require("./constants");

const insertJti = async (jti) => {
  try {
    await RedisHandler.connectRedis();
    await RedisHandler.set(`${REDIS_JTI_PREFIX}${jti}`, "1", {
      EX: REDIS_JTI_EXP,
    });
  } catch (error) {
    console.error("Error inserting JTI in Redis:", error);
    throw error;
  } finally {
    await RedisHandler.disconnectRedis();
  }
};

module.exports = {
  insertJti,
};