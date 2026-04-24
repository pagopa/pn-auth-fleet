// Outcoming source for frontend
export enum SourceChannel {
  WEB = "WEB",
  TPP = "TPP",
}

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

// The outcome object to put in the token exchange response
export interface Source {
  channel: SourceChannel;
  details: string;
  retrievalId?: string;
}

export type GetRetrievalPayloadResponse = {
  tppId: string;
  retrievalId: string;
  deepLink: string;
  pspDenomination: string;
  originId: string;
  isPaymentEnabled: boolean;
};
