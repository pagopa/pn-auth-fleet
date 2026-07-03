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
  source?: Source;
  idp?: string;
  aar?: string;
  retrievalId?: string;
}

// Base claims of the signed session token, shared by oidc and fims. The response
// reuses these so the two flows can't drift.
export interface SessionTokenPayload {
  iat: number;
  exp: number;
  uid: string;
  iss: string;
  aud: string;
  jti: string;
  source?: Source;
}

interface BuildSessionTokenResponseInput {
  sessionToken: string;
  payload: SessionTokenPayload;
  name: string;
  family_name: string;
  fiscal_number: string;
  // OIDC-only extras (absent in the FIMS flow).
  idp?: string;
  aar?: string;
  retrievalId?: string;
}

/**
 * Assemble the session-token exchange response, centralizing the field mapping
 * and the SEND-fixed constants (from_aa=false, level="L2") so oidc/token and
 * fims/exchange always return the exact same shape.
 */
export function buildSessionTokenResponse({
  sessionToken,
  payload,
  name,
  family_name,
  fiscal_number,
  idp,
  aar,
  retrievalId,
}: BuildSessionTokenResponseInput): SessionTokenResponse {
  return {
    sessionToken,
    name,
    family_name,
    fiscal_number,
    from_aa: false,
    level: "L2",
    uid: payload.uid,
    iss: payload.iss,
    aud: payload.aud,
    jti: payload.jti,
    iat: payload.iat,
    exp: payload.exp,
    source: payload.source,
    idp,
    aar,
    retrievalId,
  };
}
