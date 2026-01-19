import { SourceEvent } from "./Source";

export type RequestEventBody = {
  code?: string;
  redirect_uri: string;
  nonce?: string;
  state?: string;
  source?: SourceEvent;
};
