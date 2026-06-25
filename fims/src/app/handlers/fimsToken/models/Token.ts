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
