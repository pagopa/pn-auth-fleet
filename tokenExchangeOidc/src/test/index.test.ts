import { handler } from "../app";
import { ValidationException } from "../app/exception/validationException";
import * as AuditLog from "../app/utils/AuditLog";
import * as AwsParameters from "../app/utils/AwsParameters";
import * as OneIdentity from "../app/utils/OneIdentity";
import * as Responses from "../app/utils/Responses";
import * as Origin from "../app/validation/Origin";
import * as TokenValidation from "../app/validation/TokenValidation";
import {
  mockAllowedOrigin,
  mockState,
  mockTokenExchangeEvent,
} from "./__mock__/event.mock";
import {
  oneIdentityCredentialsMock,
  oneIdentityExchangeCodeResponseMock,
} from "./__mock__/oneIdentity.mock";
import { tokenExchangeResponse } from "./__mock__/responses.mock";
import { oneIdentityIdTokenMock } from "./__mock__/token.mock";
import { setupEnv } from "./test.utils";

const parseResponse = (result: any) => ({
  statusCode: result.statusCode,
  body: JSON.parse(result.body),
});

describe("Event Handler tests", () => {
  let auditLogSpy: jest.SpyInstance;
  let isOriginAllowedSpy: jest.SpyInstance;
  let getAWSSecretSpy: jest.SpyInstance;
  let exchangeOneIdentityCodeSpy: jest.SpyInstance;
  let validateOneIdentityIdTokenSpy: jest.SpyInstance;
  let generateTokenExchangeResponseSpy: jest.SpyInstance;

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

    getAWSSecretSpy = jest
      .spyOn(AwsParameters, "getAWSSecret")
      .mockResolvedValue(oneIdentityCredentialsMock as any);

    exchangeOneIdentityCodeSpy = jest
      .spyOn(OneIdentity, "exchangeOneIdentityCode")
      .mockResolvedValue(oneIdentityExchangeCodeResponseMock as any);

    validateOneIdentityIdTokenSpy = jest
      .spyOn(TokenValidation, "validateOneIdentityIdToken")
      .mockResolvedValue(oneIdentityIdTokenMock as any);

    generateTokenExchangeResponseSpy = jest
      .spyOn(Responses, "generateTokenExchangeResponse")
      .mockResolvedValue(tokenExchangeResponse);
  });

  afterEach(() => {
    auditLogSpy.mockRestore();
    isOriginAllowedSpy.mockRestore();
    getAWSSecretSpy.mockRestore();
    exchangeOneIdentityCodeSpy.mockRestore();
    validateOneIdentityIdTokenSpy.mockRestore();
    generateTokenExchangeResponseSpy.mockRestore();
  });

  describe("Origin validation", () => {
    it("should return error when event has no origin", async () => {
      const eventWithoutOrigin = {
        ...mockTokenExchangeEvent,
        headers: {
          origin: undefined,
        },
      };

      const result = await handler(eventWithoutOrigin, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toBe(500);
      expect(body.error).toEqual("eventOrigin is null");
      expect(body.traceId).toEqual(process.env._X_AMZN_TRACE_ID);

      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "eventOrigin is null",
        aud_orig: undefined,
        status: "KO",
      });
      expect(mockAuditLog.warn).toHaveBeenCalledWith("error");
    });

    it("should return error when the origin is not allowed", async () => {
      isOriginAllowedSpy.mockReturnValue(false);

      const eventWithInvalidOrigin = {
        ...mockTokenExchangeEvent,
        headers: {
          origin: "invalid-origin",
        },
      };

      const result = await handler(eventWithInvalidOrigin, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Origin not allowed");
      expect(body.traceId).toEqual(process.env._X_AMZN_TRACE_ID);

      expect(auditLogSpy).toHaveBeenNthCalledWith(1, {
        aud_orig: "invalid-origin",
      });
      expect(auditLogSpy).toHaveBeenNthCalledWith(2, {
        message: "Origin not allowed",
        aud_orig: "invalid-origin",
        status: "KO",
      });
      expect(mockAuditLog.info).toHaveBeenCalledTimes(1);
      expect(mockAuditLog.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Request body validation", () => {
    it("should return error when event body is not present", async () => {
      const eventWithoutBody = {
        ...mockTokenExchangeEvent,
        body: undefined,
      };

      const result = await handler(eventWithoutBody, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Missing request body");
      expect(body.traceId).toEqual(process.env._X_AMZN_TRACE_ID);

      expect(auditLogSpy).toHaveBeenNthCalledWith(2, {
        message: "Error generating token Missing request body",
        aud_orig: mockAllowedOrigin,
        status: "KO",
      });
      expect(mockAuditLog.warn).toHaveBeenCalled();
    });

    it("should return error when fails to parse body", async () => {
      const eventWithInvalidBody = {
        ...mockTokenExchangeEvent,
        body: "invalid-json{",
      };

      const result = await handler(eventWithInvalidBody, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toBeDefined();

      // Verify error audit log was called
      const errorCalls = auditLogSpy.mock.calls.filter(
        (call) =>
          call[0].status === "KO" &&
          call[0].message?.includes("Error generating token")
      );
      expect(errorCalls.length).toBeGreaterThan(0);
      expect(mockAuditLog.warn).toHaveBeenCalled();
    });

    it("should return error when event body has no code", async () => {
      const eventWithoutCode = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          redirect_uri: "https://example.com",
          nonce: "test-nonce",
          state: "test-state",
        }),
      };

      const result = await handler(eventWithoutCode, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Missing required parameters in body");
    });

    it("should return error when event body has no redirect_uri", async () => {
      const eventWithoutRedirectUri = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          code: "test-code",
          nonce: "test-nonce",
          state: "test-state",
        }),
      };

      const result = await handler(
        eventWithoutRedirectUri,
        {} as any,
        () => {}
      );
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Missing required parameters in body");
    });

    it("should return error when event body has no nonce", async () => {
      const eventWithoutNonce = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          code: "test-code",
          redirect_uri: "https://example.com",
          state: "test-state",
        }),
      };

      const result = await handler(eventWithoutNonce, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Missing required parameters in body");
    });

    it("should return error when event body has no state", async () => {
      const eventWithoutState = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          code: "test-code",
          redirect_uri: "https://example.com",
          nonce: "test-nonce",
        }),
      };

      const result = await handler(eventWithoutState, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Missing required parameters in body");
    });
  });

  describe("Token exchange flow", () => {
    it("should successfully handle valid token exchange", async () => {
      const result = await handler(mockTokenExchangeEvent, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(getAWSSecretSpy).toHaveBeenCalledTimes(1);
      expect(exchangeOneIdentityCodeSpy).toHaveBeenCalledWith({
        code: "rC2wiIdM8UjVDCU1tk-df_9DfzQG_X8qkcofpZq_ElI",
        redirectUri: "https://cittadini.dev.notifichedigitali.it/auth/callback",
        oneIdentityCredentials: oneIdentityCredentialsMock,
      });
      expect(validateOneIdentityIdTokenSpy).toHaveBeenCalledWith({
        oneIdentityIdToken: oneIdentityExchangeCodeResponseMock.id_token,
        nonce: "test-nonce-123",
        oneIdentityClientId: oneIdentityCredentialsMock.oneIdentityClientId,
      });
      expect(generateTokenExchangeResponseSpy).toHaveBeenCalledWith({
        decodedIdToken: oneIdentityIdTokenMock,
        state: mockState,
      });

      expect(statusCode).toBe(200);
      expect(body).toEqual(tokenExchangeResponse);

      // Verify success audit log with exact values
      expect(auditLogSpy).toHaveBeenCalledWith({
        message: `Token successful generated with id: ${mockState}`,
        status: "OK",
        cx_type: "PF",
        cx_id: `PF-${oneIdentityIdTokenMock.pairwise}`,
        uid: oneIdentityIdTokenMock.pairwise,
        jti: mockState,
        aud_orig: mockAllowedOrigin,
      });
      expect(mockAuditLog.info).toHaveBeenCalled();
    });

    it("should handle AWS secret retrieval failure", async () => {
      getAWSSecretSpy.mockRejectedValue(new Error("Secret not found"));

      const result = await handler(mockTokenExchangeEvent, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Secret not found");

      // Verify error audit log
      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "Error generating token Secret not found",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");

      expect(exchangeOneIdentityCodeSpy).not.toHaveBeenCalled();
      expect(validateOneIdentityIdTokenSpy).not.toHaveBeenCalled();
    });

    it("should handle exchange code failure", async () => {
      exchangeOneIdentityCodeSpy.mockRejectedValue(
        new Error("One Identity code exchange failed")
      );

      const result = await handler(mockTokenExchangeEvent, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("One Identity code exchange failed");

      expect(getAWSSecretSpy).toHaveBeenCalled();
      expect(validateOneIdentityIdTokenSpy).not.toHaveBeenCalled();

      // Verify error audit log
      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "Error generating token One Identity code exchange failed",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");
    });

    it("should handle token validation failure with ValidationException", async () => {
      validateOneIdentityIdTokenSpy.mockRejectedValue(
        new ValidationException("Error during ID Token validation")
      );

      const result = await handler(mockTokenExchangeEvent, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(400);
      expect(body.error).toEqual("Error during ID Token validation");

      expect(getAWSSecretSpy).toHaveBeenCalled();
      expect(exchangeOneIdentityCodeSpy).toHaveBeenCalled();
      expect(validateOneIdentityIdTokenSpy).toHaveBeenCalled();

      // ValidationException should trigger warn, not error
      expect(mockAuditLog.warn).toHaveBeenCalledWith("error");
      expect(mockAuditLog.error).not.toHaveBeenCalled();

      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "Error generating token Error during ID Token validation",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
    });

    it("should handle generic error during token validation", async () => {
      validateOneIdentityIdTokenSpy.mockRejectedValue(
        new Error("Unexpected validation error")
      );

      const result = await handler(mockTokenExchangeEvent, {} as any, () => {});
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Unexpected validation error");

      // Non-ValidationException should trigger error, not warn
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");
      expect(mockAuditLog.warn).not.toHaveBeenCalled();
    });
  });
});
