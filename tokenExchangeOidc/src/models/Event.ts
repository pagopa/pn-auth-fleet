export type RequestEventBody = {
  code?: string;
  redirect_uri: string;
  nonce?: string;
  source?: string;
  state?: string;
};
