export enum SourceChannel {
  WEB = "WEB",
  TPP = "TPP",
}

enum SourceEventType {
  QR = "QR",
  TPP = "TPP",
}

export interface SourceEvent {
  type: SourceEventType;
  id: string;
}

export interface Source {
  channel: SourceChannel;
  details: string;
  retrievalId?: string;
}
