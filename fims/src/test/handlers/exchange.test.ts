jest.mock("pn-auth-common", () => ({
  RedisHandler: {
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
    setJson: jest.fn(),
    getJson: jest.fn(),
  },
  COMMON_CONSTANTS: { REDIS_PN_SESSION_PREFIX: "pn-session::" },
}));

// The token validation and session-token signing reach out to KMS; they have
// their own unit tests, so stub them here to exercise routing + CORS.
jest.mock("../../app/handlers/fimsExchange/validation/ExchangeTokenValidation", () => ({
  validateFimsToken: jest.fn().mockResolvedValue({
    uid: "cx-123",
    fiscal_code: "GRBGPP87L04L741X",
    given_name: "Giuseppe Maria",
    family_name: "Garibaldi",
    state: "fake-state",
    iat: 1649686749,
    exp: 1649686809,
  }),
}));

jest.mock("../../app/handlers/fimsExchange/utils/SessionToken", () => ({
  generateSessionPayload: jest.fn().mockReturnValue({
    iat: 1649686749,
    exp: 1649693949,
    uid: "cx-123",
    iss: "https://webapi.dev.notifichedigitali.it",
    aud: "webapi.dev.pn.pagopa.it",
    jti: "fake-state",
    source: { channel: "WEB", details: "FIMS" },
  }),
  generateSessionToken: jest.fn().mockResolvedValue("fake-session-token"),
}));

import { handler } from "../../app/index";
import * as AuditLog from "../../app/utils/AuditLog";
import { setupEnv } from "../test.utils";

const mockContext = { awsRequestId: "fake-request-id" } as any;
const allowedOrigin = "https://cittadini.dev.notifichedigitali.it";

const baseExchangeEvent = {
  resource: "/exchange",
  httpMethod: "POST",
  headers: { origin: allowedOrigin },
  body: JSON.stringify({ authorizationToken: "a.b.c" }),
} as any;

describe("Main handler - /exchange routing", () => {
  let auditLogSpy: jest.SpyInstance;
  const mockAuditLog = {
    info: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    error: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupEnv();
    auditLogSpy = jest.spyOn(AuditLog, "auditLog").mockReturnValue(mockAuditLog as any);
  });

  afterEach(() => {
    auditLogSpy.mockRestore();
  });

  it("should return 200 with the oidc-style body and CORS header on the happy path", async () => {
    const result: any = await handler(baseExchangeEvent, mockContext, () => {});

    expect(result.statusCode).toBe(200);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe(allowedOrigin);

    const body = JSON.parse(result.body);
    expect(body).toEqual({
      sessionToken: "fake-session-token",
      name: "Giuseppe Maria",
      family_name: "Garibaldi",
      fiscal_number: "GRBGPP87L04L741X",
      from_aa: false,
      level: "L2",
      uid: "cx-123",
      iat: 1649686749,
      exp: 1649693949,
      iss: "https://webapi.dev.notifichedigitali.it",
      aud: "webapi.dev.pn.pagopa.it",
      jti: "fake-state",
      source: {
        channel: "WEB",
        details: "FIMS",
      },
    });
  });

  it("should reject with 400 when the Origin header is missing", async () => {
    const event = { ...baseExchangeEvent, headers: {} };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(400);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("should reject with 400 when the Origin is not allowed", async () => {
    const event = { ...baseExchangeEvent, headers: { origin: "https://evil.example.com" } };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(400);
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("https://evil.example.com");
  });
});
