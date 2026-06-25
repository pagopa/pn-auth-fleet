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
