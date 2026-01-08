export interface JWK {
  kty: string;
  use?: string;
  kid: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
  [key: string]: any;
}

export interface JWKS {
  keys: JWK[];
}
