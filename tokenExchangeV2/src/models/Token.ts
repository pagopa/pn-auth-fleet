export interface DecodedToken {
  header: {
    alg: string;
    kid: string;
  };
  payload: TokenPayload;
  signature: string;
}

export interface TokenPayload {
  iss: string;
  aud: string;
  email?: string;
  family_name?: string;
  fiscal_number?: string;
  name?: string;
  organization?: {
    roles: Array<{
      role: string;
    }>;
  };
}

// TODO - capire cosa può diventare un type (ruoli ecc)
