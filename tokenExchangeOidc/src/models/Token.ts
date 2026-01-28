import { Source } from "./Source";

export interface OIDecodedToken {
  header: {
    alg: string;
    kid?: string;
  };
  payload: OIDecodedIdToken;
  signature: string;
}

export interface OIDecodedIdToken {
  sub: string;
  aud: string;
  pairwise: string;
  familyName: string;
  iss: string;
  name: string;
  exp: number;
  iat: number;
  nonce: string;
  fiscalNumber: string;
}

export interface OIExchangeCodeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  scope: string;
  id_token: string;
  id_token_type: string;
}

export interface JwtPayload {
  iat: number;
  exp: number;
  uid: string;
  iss: string;
  aud: string;
  jti: string;
  source?: Source;
}

export interface TokenExchangeResponse extends JwtPayload {
  sessionToken: string;
  name: string;
  family_name: string;
  fiscal_number: string;
  from_aa: boolean;
  level: string;
  source?: Source;
}

export interface JwtParts {
  header: string;
  payload: string;
  signature?: string;
}
