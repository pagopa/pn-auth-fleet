const { RedisClient } = require('pn-auth-common');
const { REDIS_JTI_EXP, REDIS_JTI_PREFIX } = require("./constants");

const insertJti = async (jti) => {
  let client;

  try {
    client = await RedisClient.getRedisClient();
    await client.connect();
    await client.set(`${REDIS_JTI_PREFIX}${jti}`, "1", {
      EX: REDIS_JTI_EXP,
    });
  } catch (error) {
    throw error;
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

module.exports = {
  insertJti,
};