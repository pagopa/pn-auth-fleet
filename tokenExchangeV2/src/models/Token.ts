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

export interface OneIdentityToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  scope: string;
  id_token: string;
  id_token_type: string;
}

// TODO - capire cosa può diventare un type (ruoli ecc)
