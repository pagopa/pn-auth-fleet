const LOG_AUT_TYPE = "AUD_ACC_LOGOUT"; // TODO da confermare
const REDIS_JTI_EXP = 3600 * 24; // 24 hours in seconds
const REDIS_JTI_PREFIX = "pn-session:";

module.exports = {
  LOG_AUT_TYPE,
  REDIS_JTI_EXP,
  REDIS_JTI_PREFIX,
};