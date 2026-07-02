export type FimsTokenRequestBody = {
  code: string;
  state: string;
  iss: string;
};

export type FimsTokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
};

// Claims returned by the FIMS UserInfo endpoint (OIDC `profile` + `lollipop` scopes).
// public_key / assertion_ref / assertion are what the Lollipop Proof-of-Possession
// checks operate on (guide sec. 5.5.2).
export type FimsUserInfo = {
  sub: string;
  fiscal_code: string;
  public_key: string;
  assertion_ref: string;
  assertion: string;
  given_name?: string;
  family_name?: string;
  sid?: string;
  auth_time?: number;
  iss?: string;
};
