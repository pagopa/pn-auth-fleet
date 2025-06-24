const { RedisClient } = require('pn-auth-common');
const { REDIS_JTI_EXP, REDIS_JTI_PREFIX } = require("./constants");

const insertJti = async (jti) => {
  try {
    const client = await RedisClient.getRedisClient();
    if (!client.isReady) {
      await client.connect();
    }
    await client.set(`${REDIS_JTI_PREFIX}${jti}`, "1", {
      EX: REDIS_JTI_EXP,
    });
  } catch (error) {
    throw error;
  }
  // do not disconnect the client here, as it may be reused later
};

module.exports = {
  insertJti,
};