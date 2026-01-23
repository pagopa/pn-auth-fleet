import {
  DescribeKeyCommand,
  KMSClient,
  KMSClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
  SignCommand,
} from "@aws-sdk/client-kms";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { ValidationException } from "../../app/exception/validationException";
import { getRetrievalPayload } from "../../app/utils/EmdIntegrationClient";
import {
  generateJwtPayload,
  generateSessionToken,
  generateSourceObject,
} from "../../app/utils/TokenGenerator";
import { SourceChannel, SourceEventType } from "../../models/Source";
import {
  checkTppResponseMock,
  retrievalIdMock,
} from "../__mock__/emdIntegration.mock";
import { payloadMock } from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";

jest.mock("../../app/utils/EmdIntegrationClient.ts");

describe("TokenGenerator", () => {
  let kmsClientMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    KMSClientResolvedConfig
  >;

  beforeEach(() => {
    setupEnv();
    kmsClientMock = mockClient(KMSClient);

    // Mock Date.now() for consistent testing
    jest.spyOn(Date, "now").mockReturnValue(1649686749000);
  });

  afterEach(() => {
    kmsClientMock.reset();
    jest.restoreAllMocks();
  });

  describe("generateJwtPayload", () => {
    it("should generate a valid JWT payload with all required fields", () => {
      const pairwise = "ed84b8c9-444e-410d-80d7-cfad6aa12070";
      const state = "01G0CFW80HGTTW0RH54WQD6F6S";

      const payload = generateJwtPayload({ pairwise, state });

      expect(payload).toEqual({
        iat: 1649686749,
        exp: 1649693949, // iat + 7200 seconds (TOKEN_TTL from setupEnv)
        uid: pairwise,
        iss: "https://webapi.dev.notifichedigitali.it",
        aud: "webapi.dev.pn.pagopa.it",
        jti: state,
      });

      expect(payload.source).toBeUndefined();
    });

    it("should calculate correct expiration time based on TOKEN_TTL", () => {
      const payload = generateJwtPayload({
        pairwise: "test-pairwise",
        state: "test-state",
      });

      // TOKEN_TTL is 7200 from setupEnv
      expect(payload.exp).toBe(1649693949); // iat + 7200 seconds
      expect(payload.exp - payload.iat).toBe(7200);
    });

    it("should use issuer from environment variable", () => {
      const payload = generateJwtPayload({
        pairwise: "test-pairwise",
        state: "test-state",
      });

      expect(payload.iss).toBe("https://webapi.dev.notifichedigitali.it");
    });

    it("should use audience from environment variable", () => {
      const payload = generateJwtPayload({
        pairwise: "test-pairwise",
        state: "test-state",
      });

      expect(payload.aud).toBe("webapi.dev.pn.pagopa.it");
    });

    it("should set uid to the provided pairwise value", () => {
      const pairwise = "unique-user-id-123";

      const payload = generateJwtPayload({
        pairwise,
        state: "test-state",
      });

      expect(payload.uid).toBe(pairwise);
    });

    it("should set jti to the provided state value", () => {
      const state = "unique-state-value-456";

      const payload = generateJwtPayload({
        pairwise: "test-pairwise",
        state,
      });

      expect(payload.jti).toBe(state);
    });

    it("should include source information when provided", () => {
      const source = {
        channel: SourceChannel.TPP,
        details: "Test TPP",
        retrievalId: "retrieval-123",
      };

      const payload = generateJwtPayload({
        pairwise: "test-pairwise",
        state: "test-state",
        source,
      });

      expect(payload.source).toEqual(source);
    });
  });

  describe("generateSessionToken", () => {
    it("should generate a valid JWT token with correct structure", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      const binarySignature = new Uint8Array([
        115, 105, 103, 110, 97, 116, 117, 114, 101,
      ]);
      kmsClientMock.on(SignCommand).resolves({
        KeyId: "test-key-id",
        Signature: binarySignature,
        SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
      });

      const token = await generateSessionToken(payloadMock);

      // JWT should have three parts separated by dots
      const parts = token.split(".");
      expect(parts).toHaveLength(3);

      // Each part should be base64url encoded (no padding, URL-safe)
      parts.forEach((part) => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it("should call DescribeKeyCommand with correct alias", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        Signature: new Uint8Array([1, 2, 3]),
      });

      await generateSessionToken(payloadMock);

      expect(kmsClientMock.commandCalls(DescribeKeyCommand)).toHaveLength(1);
      expect(
        kmsClientMock.commandCalls(DescribeKeyCommand)[0].args[0].input,
      ).toEqual({
        KeyId: "SessionKey", // KEY_ALIAS from setupEnv
      });
    });

    it("should call SignCommand with correct parameters", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        Signature: new Uint8Array([1, 2, 3]),
      });

      await generateSessionToken(payloadMock);

      const signCalls = kmsClientMock.commandCalls(SignCommand);
      expect(signCalls).toHaveLength(1);

      const signInput = signCalls[0].args[0].input;
      expect(signInput.KeyId).toBe("test-key-id");
      expect(signInput.SigningAlgorithm).toBe("RSASSA_PKCS1_V1_5_SHA_256");
      expect(signInput.MessageType).toBe("RAW");
      expect(signInput.Message).toBeInstanceOf(Buffer);
    });

    it("should throw error when KMS does not return KeyId", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: undefined,
        },
      });

      await expect(generateSessionToken(payloadMock)).rejects.toThrow(
        "Unable to resolve KMS keyId for alias",
      );
    });

    it("should throw error when KMS does not return a signature", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        KeyId: "test-key-id",
      });

      await expect(generateSessionToken(payloadMock)).rejects.toThrow(
        "KMS returned an empty signature",
      );
    });

    it("should include correct header in JWT", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        Signature: new Uint8Array([1, 2, 3]),
      });

      const token = await generateSessionToken(payloadMock);
      const headerPart = token.split(".")[0];

      // Decode base64url
      const headerJson = Buffer.from(headerPart, "base64url").toString();
      const header = JSON.parse(headerJson);

      expect(header).toEqual({
        alg: "RS256",
        typ: "JWT",
        kid: "test-key-id",
      });
    });

    it("should include correct payload in JWT", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        Signature: new Uint8Array([1, 2, 3]),
      });

      const token = await generateSessionToken(payloadMock);
      const payloadPart = token.split(".")[1];

      // Decode base64url
      const payloadJson = Buffer.from(payloadPart, "base64url").toString();
      const payload = JSON.parse(payloadJson);

      expect(payload).toEqual(payloadMock);
    });

    it("should produce consistent signature for same input", async () => {
      const mockSignature = new Uint8Array([
        115, 105, 103, 110, 97, 116, 117, 114, 101,
      ]);

      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).resolves({
        Signature: mockSignature,
      });

      const token1 = await generateSessionToken(payloadMock);

      kmsClientMock.reset();
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });
      kmsClientMock.on(SignCommand).resolves({
        Signature: mockSignature,
      });

      const token2 = await generateSessionToken(payloadMock);

      expect(token1).toBe(token2);
    });

    it("should handle KMS client errors gracefully", async () => {
      kmsClientMock
        .on(DescribeKeyCommand)
        .rejects(new Error("KMS service unavailable"));

      await expect(generateSessionToken(payloadMock)).rejects.toThrow(
        "KMS service unavailable",
      );
    });

    it("should handle SignCommand errors gracefully", async () => {
      kmsClientMock.on(DescribeKeyCommand).resolves({
        KeyMetadata: {
          KeyId: "test-key-id",
        },
      });

      kmsClientMock.on(SignCommand).rejects(new Error("Signing failed"));

      await expect(generateSessionToken(payloadMock)).rejects.toThrow(
        "Signing failed",
      );
    });
  });

  describe("generateSourceObject", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return valid object when source is TPP", async () => {
      (getRetrievalPayload as jest.Mock).mockResolvedValue(
        checkTppResponseMock,
      );

      const source = { type: SourceEventType.TPP, id: retrievalIdMock };
      const result = await generateSourceObject(source);

      expect(result).toEqual({
        channel: SourceChannel.TPP,
        details: checkTppResponseMock.tppId,
        retrievalId: retrievalIdMock,
      });
      expect(getRetrievalPayload).toHaveBeenCalledWith(retrievalIdMock);
    });

    it("should return valid object when source is QR", async () => {
      const source = { type: SourceEventType.QR, id: "qr-123" };
      const result = await generateSourceObject(source);

      expect(result).toEqual({
        channel: SourceChannel.WEB,
        details: "QR_CODE",
      });
      expect(getRetrievalPayload).not.toHaveBeenCalled();
    });

    it("should return undefined when source is not defined", async () => {
      const result = await generateSourceObject(undefined);

      expect(result).toBeUndefined();
      expect(getRetrievalPayload).not.toHaveBeenCalled();
    });

    it("should throw a ValidationException when source is not valid", async () => {
      const source = { type: "INVALID", id: "invalid-123" } as any;

      await expect(generateSourceObject(source)).rejects.toThrow(
        ValidationException,
      );
      await expect(generateSourceObject(source)).rejects.toThrow(
        "Invalid source type",
      );
      expect(getRetrievalPayload).not.toHaveBeenCalled();
    });
  });
});
