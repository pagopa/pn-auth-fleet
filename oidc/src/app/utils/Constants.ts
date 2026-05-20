import { COMMON_CONSTANTS } from "pn-auth-common";

export const REDIS_STATE_PREFIX = `${COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX}oidc::`;

export const getOidcStateRedisKey = (state: string): string => `${REDIS_STATE_PREFIX}${state}`;
