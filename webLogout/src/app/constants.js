const { COMMON_CONSTANTS } = require("pn-auth-common");

const LOG_AUT_TYPE = "AUD_ACC_LOGOUT"; // TODO da confermare
const REDIS_JTI_EXP = 3600 * (Number(process.env.REDIS_JTI_EXP_HOURS || 24)); // hours in seconds
const REDIS_JTI_PREFIX = COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX;

module.exports = {
  LOG_AUT_TYPE,
  REDIS_JTI_EXP,
  REDIS_JTI_PREFIX,
};