import { JWK } from "jwk-to-pem";

type InternalJWK = JWK & {
  use?: string;
  kid: string;
  alg?: string;
  [key: string]: any;
};

export interface JWKS {
  keys: Array<InternalJWK>;
}

export type CachedJwks = {
  keys: Array<InternalJWK>;
  expiresOn: number;
  lastUpdate: number;
};
