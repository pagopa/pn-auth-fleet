export type ErrorResponseBody = {
  error?: string | Error;
  status?: number;
  traceId?: string;
};
