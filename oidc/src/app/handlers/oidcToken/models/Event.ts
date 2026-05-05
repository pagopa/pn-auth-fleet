import { SourceEvent } from "./Source";

export type RequestEventBody = {
  code: string;
  nonce: string;
  state: string;
  source?: SourceEvent;
};
