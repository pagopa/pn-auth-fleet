import {
  OIDecodedIdToken,
  OIDecodedToken,
  OIExchangeCodeResponse,
} from "../../models/Token";

export const oneIdentityExchangeCodeResponseMock: OIExchangeCodeResponse = {
  access_token: "mock_access_token",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: null,
  scope: "mock_scope",
  id_token: "mock_id_token",
  id_token_type: "mock_id_token_type",
};

export const tokenNonce = "test-nonce-123";

export const oneIdentityIdTokenMock: OIDecodedIdToken = {
  iss: "https://spid-hub-test.dev.pn.pagopa.it",
  aud: "portale-pf-develop.fe.dev.pn.pagopa.it",
  fiscalNumber: "RRRPRR50L17C282Y",
  nonce: tokenNonce,
  name: "Mario",
  familyName: "Rossi",
  pairwise: "pairwise-12345",
  sub: "subject-12345",
  iat: 1700000000,
  exp: 1700003600,
};

export const oneIdentityDecodedTokenMock: OIDecodedToken = {
  header: { alg: "RS256", kid: "test-kid" },
  payload: oneIdentityIdTokenMock,
  signature: "test-signature",
};
