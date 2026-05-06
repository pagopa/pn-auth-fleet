import { RedisHandler } from "pn-auth-common";
import { ValidationException } from "../../../app/exception/validationException";
import { oidcTokenHandler as handler } from "../../../app/handlers/oidcToken";

jest.mock("pn-auth-common", () => ({
  RedisHandler: {
    connectRedis: jest.fn().mockResolvedValue(undefined),
    disconnectRedis: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  },
  COMMON_CONSTANTS: { REDIS_PN_SESSION_PREFIX: "test::" },
}));
import * as AwsParameters from "../../../app/handlers/oidcToken/utils/AwsParameters";
import * as EmdIntegrationClient from "../../../app/handlers/oidcToken/utils/EmdIntegrationClient";
import * as OneIdentity from "../../../app/handlers/oidcToken/utils/OneIdentity";
import * as Responses from "../../../app/handlers/oidcToken/utils/Responses";
import * as TokenGenerator from "../../../app/handlers/oidcToken/utils/TokenGenerator";
import * as TokenValidation from "../../../app/handlers/oidcToken/validation/TokenValidation";
import * as AuditLog from "../../../app/utils/AuditLog";
import {
    checkTppResponseMock,
    retrievalIdMock,
} from "../../__mock__/emdIntegration.mock";
import {
    mockAllowedOrigin,
    mockState,
    mockTokenExchangeEvent,
} from "../../__mock__/event.mock";
import {
    oneIdentityCredentialsMock,
    oneIdentityExchangeCodeResponseMock,
} from "../../__mock__/oneIdentity.mock";
import { tokenExchangeResponse } from "../../__mock__/responses.mock";
import { oneIdentityIdTokenMock } from "../../__mock__/token.mock";
import { setupEnv } from "../../test.utils";

const parseResponse = (result: any) => ({
  statusCode: result.statusCode,
  body: JSON.parse(result.body),
});

describe("Event Handler tests", () => {
  let auditLogSpy: jest.SpyInstance;
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
    getAWSSecretSpy.mockRestore();
    exchangeOneIdentityCodeSpy.mockRestore();
    validateOneIdentityIdTokenSpy.mockRestore();
    generateTokenExchangeResponseSpy.mockRestore();
  });


  describe("Token exchange flow", () => {
    it("should successfully handle valid token exchange", async () => {
      const result = await handler(mockTokenExchangeEvent as any);
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

      expect(RedisHandler.del).toHaveBeenCalledWith(`test::oidc::${mockState}`);
    });

    it("should handle AWS secret retrieval failure", async () => {
      getAWSSecretSpy.mockRejectedValue(new Error("Secret not found"));

      const result = await handler(mockTokenExchangeEvent as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Secret not found");

      // Verify error audit log
      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "Error generating token: Secret not found",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");

      expect(exchangeOneIdentityCodeSpy).not.toHaveBeenCalled();
      expect(validateOneIdentityIdTokenSpy).not.toHaveBeenCalled();

      expect(RedisHandler.del).toHaveBeenCalledWith(`test::oidc::${mockState}`);
    });

    it("should handle exchange code failure", async () => {
      exchangeOneIdentityCodeSpy.mockRejectedValue(
        new Error("One Identity code exchange failed"),
      );

      const result = await handler(mockTokenExchangeEvent as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("One Identity code exchange failed");

      expect(getAWSSecretSpy).toHaveBeenCalled();
      expect(validateOneIdentityIdTokenSpy).not.toHaveBeenCalled();

      // Verify error audit log
      expect(auditLogSpy).toHaveBeenCalledWith({
        message: "Error generating token: One Identity code exchange failed",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");
    });

    it("should handle token validation failure with ValidationException", async () => {
      validateOneIdentityIdTokenSpy.mockRejectedValue(
        new ValidationException("Error during ID Token validation"),
      );

      const result = await handler(mockTokenExchangeEvent as any);
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
        message: "Error generating token: Error during ID Token validation",
        status: "KO",
        aud_orig: mockAllowedOrigin,
      });
    });

    it("should handle generic error during token validation", async () => {
      validateOneIdentityIdTokenSpy.mockRejectedValue(
        new Error("Unexpected validation error"),
      );

      const result = await handler(mockTokenExchangeEvent as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toEqual(500);
      expect(body.error).toEqual("Unexpected validation error");

      // Non-ValidationException should trigger error, not warn
      expect(mockAuditLog.error).toHaveBeenCalledWith("error");
      expect(mockAuditLog.warn).not.toHaveBeenCalled();
    });
  });

  describe("Token Exchange with source", () => {
    let getRetrievalPayloadSpy: jest.SpyInstance;

    beforeEach(() => {
      getRetrievalPayloadSpy = jest
        .spyOn(EmdIntegrationClient, "getRetrievalPayload")
        .mockResolvedValue(checkTppResponseMock);

      generateTokenExchangeResponseSpy = jest
        .spyOn(Responses, "generateTokenExchangeResponse")
        .mockImplementation(async ({ source }) => ({
          ...tokenExchangeResponse,
          source,
        }));
    });

    afterEach(() => {
      getRetrievalPayloadSpy.mockRestore();
    });

    it("should successfully handle token exchange with TPP source", async () => {
      const eventWithTppSource = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          ...JSON.parse(mockTokenExchangeEvent.body as string),
          source: {
            type: "TPP",
            id: retrievalIdMock,
          },
        }),
      };

      const result = await handler(eventWithTppSource as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toBe(200);
      expect(body.source).toEqual({
        channel: "TPP",
        details: checkTppResponseMock.tppId,
        retrievalId: retrievalIdMock,
      });
      expect(getRetrievalPayloadSpy).toHaveBeenCalledWith(retrievalIdMock);
    });

    it("should successfully handle token exchange with QR source", async () => {
      const eventWithQrSource = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          ...JSON.parse(mockTokenExchangeEvent.body as string),
          source: {
            type: "QR",
            id: "qr-123",
          },
        }),
      };

      const result = await handler(eventWithQrSource as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toBe(200);
      expect(body.source).toEqual({
        channel: "WEB",
        details: "QR_CODE",
      });
    });

    it("should successfully handle token exchange without source", async () => {
      const result = await handler(mockTokenExchangeEvent as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toBe(200);
      expect(body.source).toBeUndefined();
    });

    it("should handle error when generateSourceObject fails", async () => {
      const generateSourceObjectSpy = jest
        .spyOn(TokenGenerator, "generateSourceObject")
        .mockRejectedValue(new Error("Failed to retrieve TPP payload"));

      const eventWithTppSource = {
        ...mockTokenExchangeEvent,
        body: JSON.stringify({
          ...JSON.parse(mockTokenExchangeEvent.body as string),
          source: {
            type: "TPP",
            id: retrievalIdMock,
          },
        }),
      };

      const result = await handler(eventWithTppSource as any);
      const { statusCode, body } = parseResponse(result);

      expect(statusCode).toBe(500);
      expect(body.error).toEqual("Failed to retrieve TPP payload");

      expect(mockAuditLog.error).toHaveBeenCalledWith("error");

      generateSourceObjectSpy.mockRestore();
    });
  });
});
