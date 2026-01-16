import { OIExchangeCodeResponse } from "../../models/Token";

export const oneIdentityClientIdMock = "one-identity-client-id";
const oneIdentityClientSecretMock = "one-identity-client-secret";

export const oneIdentityCredentialsMock = {
  oneIdentityClientId: oneIdentityClientIdMock,
  oneIdentityClientSecret: oneIdentityClientSecretMock,
};

export const oneIdentityExchangeCodeResponseMock: OIExchangeCodeResponse = {
  access_token: "mock_access_token",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: null,
  scope: "mock_scope",
  id_token: "mock_id_token",
  id_token_type: "mock_id_token_type",
};
