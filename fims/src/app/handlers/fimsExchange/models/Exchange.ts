// Body posted by the frontend to /exchange. The short-lived fimsToken (issued by
// /token, delivered in the redirect fragment) is carried in `authorizationToken`,
// the same field name tokenExchange uses.
export interface FimsExchangeRequestBody {
  authorizationToken: string;
}

// Long-lived session token payload, same shape as the oidc session token.
export interface FimsSessionTokenPayload {
  iat: number;
  exp: number;
  uid: string;
  iss: string;
  aud: string;
  jti: string;
}

// Success body returned to the frontend, mirroring oidc/token's response.
// FIMS-inapplicable oidc fields (idp, source, aar, retrievalId) are omitted.
export interface FimsExchangeResponse extends FimsSessionTokenPayload {
  sessionToken: string;
  name: string;
  family_name: string;
  fiscal_number: string;
  from_aa: boolean;
  level: string;
}
