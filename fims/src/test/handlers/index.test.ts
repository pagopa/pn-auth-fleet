jest.mock("pn-auth-common", () => ({
  RedisHandler: {
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
    setJson: jest.fn(),
    getJson: jest.fn(),
  },
  COMMON_CONSTANTS: {
    REDIS_PN_SESSION_PREFIX: "pn-session::",
  },
}));

jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  getAWSSecret: jest.fn().mockResolvedValue({
    fimsClientId: "fake-client-id",
    fimsClientSecret: "fake-client-secret",
  }),
}));

// The fims-token happy path delegates the actual token exchange and id_token
// verification to these collaborators, which reach out to FIMS over HTTP; they
// have their own unit tests, so here they are stubbed to exercise routing.
jest.mock("../../app/handlers/fimsToken/utils/Fims", () => ({
  exchangeFimsCode: jest.fn().mockResolvedValue({
    access_token: "fake-access-token",
    id_token: "fake-id-token",
    token_type: "Bearer",
    expires_in: 3600,
  }),
}));

jest.mock("../../app/handlers/fimsToken/validation/TokenValidation", () => ({
  validateFimsIdToken: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../app/handlers/fimsToken/utils/UserInfo", () => ({
  getFimsUserInfo: jest.fn().mockResolvedValue({
    sub: "AAAAAA00A00A000A",
    fiscal_code: "AAAAAA00A00A000A",
    public_key: "fake-public-key",
    assertion_ref: "sha256-fake",
    assertion: "<fake-saml-assertion/>",
  }),
}));

import { RedisHandler } from "pn-auth-common";
import { handler } from "../../app/index";
import * as AuditLog from "../../app/utils/AuditLog";
import { getFimsStateRedisKey } from "../../app/utils/Constants";
import { setupEnv } from "../test.utils";

const mockRequestId = "fake-request-id";
const mockContext = { awsRequestId: mockRequestId } as any;

const baseEvent = {
  headers: {},
  queryStringParameters: {},
  body: null,
} as any;

describe("Main handler - routing (no origin validation)", () => {
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

  it("should route GET /authorize and return a 302 to the OAuth provider", async () => {
    const event = { ...baseEvent, resource: "/authorize", httpMethod: "GET" };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(302);
    // No CORS header is set for FIMS
    expect(result.headers["Access-Control-Allow-Origin"]).toBeUndefined();

    const location = new URL(result.headers.Location);
    expect(location.origin + location.pathname).toBe("https://oauth.io.pagopa.it/authorize");
    expect(location.searchParams.get("client_id")).toBe("fake-client-id");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("openid profile lollipop");
    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://webapi.dev.notifichedigitali.it/fims/token",
    );
    const state = location.searchParams.get("state") ?? "";
    const nonce = location.searchParams.get("nonce") ?? "";
    expect(state).toBeTruthy();
    expect(nonce).toBeTruthy();

    // state/nonce are persisted in Redis with a TTL
    expect(RedisHandler.setJson).toHaveBeenCalledWith(getFimsStateRedisKey(state), { nonce }, { EX: 300 });
    expect(RedisHandler.connectRedis).toHaveBeenCalledTimes(1);
    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should route POST /fims-token and redirect to the frontend with the token in the fragment", async () => {
    (RedisHandler.getJson as jest.Mock).mockResolvedValue({ nonce: "fake-nonce" });

    const event = {
      ...baseEvent,
      resource: "/token",
      httpMethod: "POST",
      body: JSON.stringify({
        code: "fake-code",
        state: "fake-state",
        iss: "https://oauth.io.pagopa.it",
      }),
    };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(302);
    expect(result.headers.Location).toBe(
      "https://cittadini.dev.notifichedigitali.it#token=fake-access-token",
    );
    // No CORS header is set for FIMS
    expect(result.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("should not require an Origin header", async () => {
    const event = { ...baseEvent, resource: "/authorize", httpMethod: "GET", headers: {} };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(302);
  });

  it("should throw on an unsupported resource", async () => {
    const event = { ...baseEvent, resource: "/unknown" };

    await expect(handler(event, mockContext, () => {})).rejects.toThrow("Unsupported resource: /unknown");
  });
});
