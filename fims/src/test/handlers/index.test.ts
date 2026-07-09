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
  validateLollipop: jest.fn(),
  LollipopValidationError: class LollipopValidationError extends Error {
    constructor(errorCode: string, message: string) {
      super(message);
      this.name = "LollipopValidationError";
      Object.assign(this, { errorCode });
    }
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
    sub: "LVLDAA85T50G702B",
    fiscal_code: "LVLDAA85T50G702B",
    public_key: "fake-public-key",
    assertion_ref: "sha256-fake",
    assertion: "<fake-saml-assertion/>",
    family_name: "Lovelace",
    given_name: "Ada",
  }),
}));

// The KMS signing lives in pn-auth-common-ts (tested there); stub the FIMS token
// generator so routing can be exercised without reaching KMS.
jest.mock("../../app/handlers/fimsToken/utils/TokenGenerator", () => ({
  generateFimsJwtPayload: jest.fn().mockReturnValue({ uid: "fake-cx-id" }),
  generateSessionToken: jest.fn().mockResolvedValue("fake-session-token"),
}));

// pn-data-vault resolves the internal cx id; stub it to avoid the HTTP call.
// It returns the id in the "PF-<uuid>" form, so the handler must strip the
// "PF-" prefix before putting the bare uuid into the token payload.
jest.mock("../../app/utils/DataVault", () => ({
  getCxId: jest.fn().mockResolvedValue("PF-8d0c83f3-bb80-4534-b0ba-f35a59563cc5"),
}));

import {
  LollipopValidationError,
  RedisHandler,
  validateLollipop,
} from "pn-auth-common";
import { handler } from "../../app/index";
import * as AuditLog from "../../app/utils/AuditLog";
import { getFimsStateRedisKey } from "../../app/utils/Constants";
import {
  generateFimsJwtPayload,
  generateSessionToken,
} from "../../app/handlers/fimsToken/utils/TokenGenerator";
import { getCxId } from "../../app/utils/DataVault";
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
    auditLogSpy = jest
      .spyOn(AuditLog, "auditLog")
      .mockReturnValue(mockAuditLog as any);
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
    expect(location.origin + location.pathname).toBe(
      "https://oauth.io.pagopa.it/authorize",
    );
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
    expect(RedisHandler.setJson).toHaveBeenCalledWith(
      getFimsStateRedisKey(state),
      { nonce },
      { EX: 60 },
    );
    expect(RedisHandler.connectRedis).toHaveBeenCalledTimes(1);
    expect(RedisHandler.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it("should route GET /fims-token and redirect to the frontend with the token in the fragment", async () => {
    (RedisHandler.getJson as jest.Mock).mockResolvedValue({
      nonce: "fake-nonce",
    });

    const event = {
      ...baseEvent,
      resource: "/token",
      httpMethod: "GET",
      queryStringParameters: {
        code: "fake-code",
        state: "fake-state",
        iss: "https://oauth.io.pagopa.it",
      },
    };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(302);
    // utm params in the query string (visible to analytics), token in the fragment (not sent to the server)
    expect(result.headers.Location).toBe(
      "https://cittadini.dev.notifichedigitali.it/?utm_source=ioapp&utm_medium=app&utm_campaign=visita_send#fimsToken=fake-session-token",
    );
    // No CORS header is set for FIMS
    expect(result.headers["Access-Control-Allow-Origin"]).toBeUndefined();

    expect(validateLollipop).toHaveBeenCalledWith(
      expect.objectContaining({
        assertion: "<fake-saml-assertion/>",
        assertionRef: "sha256-fake",
        publicKey: "fake-public-key",
        fiscalCode: "LVLDAA85T50G702B",
        expectedNonce: "fake-state",
        expectedSignedHeaders: {
          "x-pagopa-lollipop-original-method": "GET",
          "x-pagopa-lollipop-custom-code": "fake-code",
          "x-pagopa-lollipop-custom-state": "fake-state",
          "x-pagopa-lollipop-custom-iss": "https://oauth.io.pagopa.it",
        },
      }),
    );
    // The cx id (uid) is resolved from pn-data-vault using the fiscal code
    expect(getCxId).toHaveBeenCalledWith("LVLDAA85T50G702B");

    // The session token is built from the UserInfo claims, the cx id and the OIDC
    // state. The "PF-" prefix returned by pn-data-vault is stripped: the payload
    // gets the bare uuid, not "PF-8d0c83f3-...".
    expect(generateFimsJwtPayload).toHaveBeenCalledWith({
      uid: "8d0c83f3-bb80-4534-b0ba-f35a59563cc5",
      fiscalCode: "LVLDAA85T50G702B",
      givenName: "Ada",
      familyName: "Lovelace",
      state: "fake-state",
    });
    expect(generateSessionToken).toHaveBeenCalledTimes(1);
  });

  it("should return a generic Lollipop error, log the technical detail and not create a session when Lollipop validation fails", async () => {
    (RedisHandler.getJson as jest.Mock).mockResolvedValue({
      nonce: "fake-nonce",
    });

    (validateLollipop as jest.Mock).mockRejectedValueOnce(
      new LollipopValidationError(
        "INVALID_SIGNATURE",
        "The assertion signature is not valid",
      ),
    );

    const event = {
      ...baseEvent,
      resource: "/token",
      httpMethod: "GET",
      queryStringParameters: {
        code: "fake-code",
        state: "fake-state",
        iss: "https://oauth.io.pagopa.it",
      },
    };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      error: "Lollipop validation failed",
      status: 400,
    });

    expect(result.body).not.toContain("The assertion signature is not valid");

    expect(auditLogSpy).toHaveBeenCalledWith({
      message:
        "fims-token Lollipop validation failed [INVALID_SIGNATURE]: The assertion signature is not valid",
      status: "KO",
      request_id: mockRequestId,
    });
    expect(mockAuditLog.error).toHaveBeenCalledWith("error");

    expect(getCxId).not.toHaveBeenCalled();
    expect(generateFimsJwtPayload).not.toHaveBeenCalled();
    expect(generateSessionToken).not.toHaveBeenCalled();
  });

  it("should not require an Origin header", async () => {
    const event = {
      ...baseEvent,
      resource: "/authorize",
      httpMethod: "GET",
      headers: {},
    };

    const result: any = await handler(event, mockContext, () => {});

    expect(result.statusCode).toBe(302);
  });

  it("should throw on an unsupported resource", async () => {
    const event = { ...baseEvent, resource: "/unknown" };

    await expect(handler(event, mockContext, () => {})).rejects.toThrow(
      "Unsupported resource: /unknown",
    );
  });
});
