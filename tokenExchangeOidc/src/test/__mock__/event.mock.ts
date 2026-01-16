export const mockAllowedOrigin = "https://cittadini.dev.notifichedigitali.it";
export const mockState = "01G0CFW80HGTTW0RH54WQD6F6S";
export const tokenNonce = "test-nonce-123";

export const mockTokenExchangeEvent = {
  headers: {
    origin: mockAllowedOrigin,
  },
  body: JSON.stringify({
    code: "rC2wiIdM8UjVDCU1tk-df_9DfzQG_X8qkcofpZq_ElI",
    redirect_uri: "https://cittadini.dev.notifichedigitali.it/auth/callback",
    nonce: tokenNonce,
    state: mockState,
  }),
} as any;
