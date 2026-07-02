// Shared shape of the session-token exchange response returned to the frontend
// by both oidc/token and fims/exchange, so the two responses are identical.
//
// The fields that only apply to the OIDC flow (source / idp / aar / retrievalId)
// are optional: oidc populates them, fims omits them.

// Outgoing source channel for the frontend.
export enum SourceChannel {
  WEB = "WEB",
  TPP = "TPP",
}

export interface Source {
  channel: SourceChannel;
  details: string;
  retrievalId?: string;
}

export interface SessionTokenResponse {
  sessionToken: string;
  name: string;
  family_name: string;
  fiscal_number: string;
  from_aa: boolean;
  level: string;
  uid: string;
  iss: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  // OIDC-only fields (absent in the FIMS flow).
  source?: Source;
  idp?: string;
  aar?: string;
  retrievalId?: string;
}
