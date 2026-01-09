const sessionToken = "a.b.c";

const decodedToken = {
  testKey: "testValue",
  testKey2: "testValue2",
};

export const allowedOrigin = "origin";

export const okResponse = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },
  body: JSON.stringify({ ...decodedToken, sessionToken }),
  isBase64Encoded: false,
};

export const makeKoResponse = (message: string, statusCode: number) => ({
  statusCode,
  body: JSON.stringify({
    error: message,
    status: statusCode,
    traceId: "my_trace_id",
  }),
  headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },
  isBase64Encoded: false,
});
