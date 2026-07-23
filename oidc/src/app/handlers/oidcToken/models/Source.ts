// Outgoing source for the frontend: shared with fims so both responses match.
export { SourceChannel, type Source } from "pn-auth-common-ts";

// Incoming source as request body of the Token Exchange
export enum SourceEventType {
  QR = "QR",
  TPP = "TPP",
}

// The incoming object as request body of the Token Exchange
export interface SourceEvent {
  type: SourceEventType;
  id: string;
}

export type GetRetrievalPayloadResponse = {
  tppId: string;
  retrievalId: string;
  deepLink: string;
  pspDenomination: string;
  originId: string;
  isPaymentEnabled: boolean;
};
