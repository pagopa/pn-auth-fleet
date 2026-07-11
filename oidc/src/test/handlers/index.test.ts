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

import { COMMON_CONSTANTS } from "pn-auth-common";
import { handler } from "../../app/index";
import * as AuditLog from "../../app/utils/AuditLog";
import * as Origin from "../../app/utils/Origin";
import { mockContext, mockRequestId, mockTokenExchangeEvent } from "../__mock__/event.mock";
import { setupEnv } from "../test.utils";

const parseResponse = (result: any) => ({
  statusCode: result.statusCode,
  body: JSON.parse(result.body),
});

describe("Main handler - Origin validation", () => {
  let auditLogSpy: jest.SpyInstance;
  let isOriginAllowedSpy: jest.SpyInstance;

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

    isOriginAllowedSpy = jest
      .spyOn(Origin, "isOriginAllowed")
      .mockReturnValue(true);
  });

  afterEach(() => {
    auditLogSpy.mockRestore();
    isOriginAllowedSpy.mockRestore();
  });

  it("should return error when event has no origin", async () => {
    const eventWithoutOrigin = {
      ...mockTokenExchangeEvent,
      resource: "/token",
      headers: { origin: undefined },
    };

    const result = await handler(eventWithoutOrigin as any, mockContext, () => {});
    const { statusCode, body } = parseResponse(result);

    expect(statusCode).toBe(500);
    expect(body.error).toEqual("eventOrigin is null");
    expect(body.traceId).toEqual(process.env._X_AMZN_TRACE_ID);

    expect(auditLogSpy).toHaveBeenCalledWith({
      message: "eventOrigin is null",
      aud_orig: undefined,
      status: "KO",
      request_id: mockRequestId,
    });
    expect(mockAuditLog.warn).toHaveBeenCalledWith("error");
  });

  it("should return error when the origin is not allowed", async () => {
    isOriginAllowedSpy.mockReturnValue(false);

    const eventWithInvalidOrigin = {
      ...mockTokenExchangeEvent,
      resource: "/token",
      headers: { origin: "invalid-origin" },
    };

    const result = await handler(eventWithInvalidOrigin as any, mockContext, () => {});
    const { statusCode, body } = parseResponse(result);

    expect(statusCode).toEqual(500);
    expect(body.error).toEqual("Origin not allowed");
    expect(body.traceId).toEqual(process.env._X_AMZN_TRACE_ID);

    expect(auditLogSpy).toHaveBeenNthCalledWith(1, {
      aud_orig: "invalid-origin",
      request_id: mockRequestId,
    });
    expect(auditLogSpy).toHaveBeenNthCalledWith(2, {
      message: "Origin: invalid-origin is not allowed",
      aud_orig: "invalid-origin",
      status: "KO",
      request_id: mockRequestId,
    });
    expect(mockAuditLog.info).toHaveBeenCalledTimes(1);
    expect(mockAuditLog.warn).toHaveBeenCalledTimes(1);
  });
});
