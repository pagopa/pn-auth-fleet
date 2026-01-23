import { TokenExchangeResponse } from "../../models/Token";
import { mockState } from "./event.mock";
import { userIdMock } from "./token.mock";

export const allowedOrigin = "origin";

export const tokenExchangeResponse: TokenExchangeResponse = {
  sessionToken:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5LWlkIn0.eyJpYXQiOjE2NDk2ODY3NDksImV4cCI6MTY0OTY5Mzk0OSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwiaXNzIjoicG4tZGV2ZWxvcC5wbi5wYWdvcGEuaXQiLCJhdWQiOiJ3ZWJhcGkuZGV2LnBuLnBhZ29wYS5pdCIsImp0aSI6IjAxRzBDRlc4MEhHVFRXMFJINTRXUUQ2RjZTIn0.mock_signature",
  family_name: "Rossi",
  fiscal_number: "RRRPRR50L17C282Y",
  name: "Mario",
  from_aa: false,
  uid: userIdMock,
  level: "L2",
  iat: 1649686749,
  exp: 1649693949,
  aud: "webapi.dev.notifichedigitali.it",
  iss: "https://webapi.dev.notifichedigitali.it",
  jti: mockState,
};

export const okResponseMock = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },
  body: JSON.stringify(tokenExchangeResponse),
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
