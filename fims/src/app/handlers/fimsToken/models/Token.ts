export interface FimsDecodedToken {
  header: {
    alg: string;
    kid: string;
  };
  payload: FimsDecodedIdToken;
  signature: string;
}

export interface FimsDecodedIdToken {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  nonce: string;
}

// FIMS session token payload: short-lived, single-use handoff to the frontend.
// iat/exp carry the FIMS_TOKEN_TTL duration.
export interface FimsJwtPayload {
  uid: string;
  fiscal_code: string;
  given_name: string;
  family_name: string;
  state: string;
  iat: number;
  exp: number;
}
