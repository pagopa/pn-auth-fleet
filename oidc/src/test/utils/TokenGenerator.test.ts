import { signKmsJwt } from "pn-auth-common-ts";
import { SourceChannel } from "../../app/handlers/oidcToken/models/Source";
import { getRetrievalPayload } from "../../app/handlers/oidcToken/utils/EmdIntegrationClient";
import {
  generateJwtPayload,
  generateSessionToken,
  generateSourceObject,
} from "../../app/handlers/oidcToken/utils/TokenGenerator";
import { checkTppResponseMock, retrievalIdMock } from "../__mock__/emdIntegration.mock";
import { payloadMock } from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";
import { OidcStateData } from "../../app/models/OidcState";

jest.mock("../../app/handlers/oidcToken/utils/EmdIntegrationClient.ts");

// The KMS signing itself lives in pn-auth-common-ts (tested there); here we only
// verify that oidc delegates with the right payload and KEY_ALIAS.
jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  signKmsJwt: jest.fn(),
}));

const signKmsJwtMock = signKmsJwt as jest.Mock;

describe("TokenGenerator", () => {
  beforeEach(() => {
    setupEnv();

    // Mock Date.now() for consistent testing
    jest.spyOn(Date, "now").mockReturnValue(1649686749000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    signKmsJwtMock.mockReset();
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
    it("should delegate to signKmsJwt with the payload and KEY_ALIAS from env", async () => {
      signKmsJwtMock.mockResolvedValue("signed.session.token");

      const token = await generateSessionToken(payloadMock);

      expect(token).toBe("signed.session.token");
      expect(signKmsJwtMock).toHaveBeenCalledTimes(1);
      expect(signKmsJwtMock).toHaveBeenCalledWith({
        payload: { ...payloadMock },
        keyAlias: "SessionKey", // KEY_ALIAS from setupEnv
      });
    });

    it("should propagate errors from signKmsJwt", async () => {
      signKmsJwtMock.mockRejectedValue(new Error("Signing failed"));

      await expect(generateSessionToken(payloadMock)).rejects.toThrow("Signing failed");
    });
  });

  const oidcStateMock: OidcStateData = {
    nonce: "test-nonce",
    idp: "test-idp",
  };
  describe("generateSourceObject", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return valid object when source is TPP", async () => {
      (getRetrievalPayload as jest.Mock).mockResolvedValue(checkTppResponseMock);

      const result = await generateSourceObject({ ...oidcStateMock, retrievalId: retrievalIdMock });

      expect(result).toEqual({
        channel: SourceChannel.TPP,
        details: checkTppResponseMock.tppId,
        retrievalId: retrievalIdMock,
      });
      expect(getRetrievalPayload).toHaveBeenCalledWith(retrievalIdMock);
    });

    it("should return valid object when source is QR", async () => {
      const result = await generateSourceObject({ ...oidcStateMock, aar: "qr-123" });

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

    it("should return undefined when neither aar nor retrievalId is present", async () => {
      const result = await generateSourceObject({ ...oidcStateMock });

      expect(result).toBeUndefined();
      expect(getRetrievalPayload).not.toHaveBeenCalled();
    });
  });
});
