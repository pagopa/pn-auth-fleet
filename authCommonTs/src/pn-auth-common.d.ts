// Ambient type declarations for the plain-JS `pn-auth-common` package (which
// ships no types). Centralized here so the TypeScript lambdas (oidc, fims, ...)
// get them transitively by depending on pn-auth-common-ts, instead of each
// duplicating this file under src/@types.
declare module "pn-auth-common" {
  export const RedisHandler: {
    connectRedis(): Promise<void>;
    disconnectRedis(): Promise<void>;
    set(key: string, value: string, options?: { EX?: number; NX?: boolean; XX?: boolean }): Promise<void>;
    get(key: string): Promise<string | null>;
    setJson<T>(key: string, value: T, options?: { EX?: number }): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    del(key: string): Promise<void>;
  };
  export const COMMON_CONSTANTS: {
    [key: string]: string;
  };

  export type LollipopIdpConfig = {
    baseUrl: string;
    cieEntityIds: string[];
    timeoutMs?: number;
  };

  export type LollipopValidationInput = {
    assertion: string;
    assertionRef: string;
    publicKey: string;
    fiscalCode: string;
    headers: Record<string, string | undefined>;
    expectedNonce: string;
    expectedSignedHeaders?: Record<string, string>;
    assertionExpireInDays?: number;
    idpConfig: LollipopIdpConfig;
  };

  export class LollipopValidationError extends Error {
    errorCode: string;

    constructor(errorCode: string, message: string, cause?: Error);
  }

  export function validateLollipop(
    input: LollipopValidationInput,
  ): Promise<void>;
}
