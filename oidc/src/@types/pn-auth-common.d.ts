declare module "pn-auth-common" {
  export const RedisHandler: {
    connectRedis(): Promise<void>;
    disconnectRedis(): Promise<void>;
    set(key: string, value: string, options?: { EX?: number; NX?: boolean; XX?: boolean }): Promise<void>;
    get(key: string): Promise<string | null>;
    setJson(key: string, value: unknown, options?: { EX?: number }): Promise<void>;
    getJson<T = unknown>(key: string): Promise<T | null>;
  };
}
