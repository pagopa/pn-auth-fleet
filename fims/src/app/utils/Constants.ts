import { COMMON_CONSTANTS } from "pn-auth-common";

export const REDIS_STATE_PREFIX = `${COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX}fims::`;
export const REDIS_SESSION_PREFIX = `${COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX}fims-session::`;

export const getFimsStateRedisKey = (state: string): string => `${REDIS_STATE_PREFIX}${state}`;
export const getFimsSessionRedisKey = (fimsId: string): string => `${REDIS_SESSION_PREFIX}${fimsId}`;
