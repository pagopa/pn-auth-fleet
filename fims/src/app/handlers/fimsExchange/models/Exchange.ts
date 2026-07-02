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

// Success body returned to the frontend: shared with oidc/token so the two
// responses are identical (oidc-only fields idp/source/aar/retrievalId omitted).
export type { SessionTokenResponse as FimsExchangeResponse } from "pn-auth-common-ts";
