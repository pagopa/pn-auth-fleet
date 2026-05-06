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
    [key:string]: string;
  };
}
