import { signKmsJwt, SourceChannel } from "pn-auth-common-ts";
import {
  generateSessionPayload,
  generateSessionToken,
} from "../../app/handlers/fimsExchange/utils/SessionToken";
import { setupEnv } from "../test.utils";

// KMS signing lives in pn-auth-common-ts (tested there); here we verify the
// oidc-style payload and the KEY_ALIAS delegation.
jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  signKmsJwt: jest.fn(),
}));

const signKmsJwtMock = signKmsJwt as jest.Mock;

describe("FIMS exchange SessionToken", () => {
  beforeEach(() => {
    setupEnv();
    jest.spyOn(Date, "now").mockReturnValue(1649686749000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    signKmsJwtMock.mockReset();
  });

  describe("generateSessionPayload", () => {
    it("should build the oidc-style payload from uid/state and env config", () => {
      const payload = generateSessionPayload({ uid: "cx-123", state: "fake-state" });

      expect(payload).toEqual({
        iat: 1649686749,
        exp: 1649693949, // iat + 7200 (TOKEN_TTL from setupEnv)
        uid: "cx-123",
        iss: "https://webapi.dev.notifichedigitali.it",
        aud: "webapi.dev.pn.pagopa.it",
        jti: "fake-state",
        source: { channel: "WEB", details: "FIMS" },
      });
    });
  });

  describe("generateSessionToken", () => {
    const payload = {
      iat: 1649686749,
      exp: 1649693949,
      uid: "cx-123",
      iss: "https://webapi.dev.notifichedigitali.it",
      aud: "webapi.dev.pn.pagopa.it",
      jti: "fake-state",
      source: { channel: SourceChannel.WEB, details: "FIMS" },
    };

    it("should delegate to signKmsJwt with the payload and KEY_ALIAS from env", async () => {
      signKmsJwtMock.mockResolvedValue("signed.session.token");

      const token = await generateSessionToken(payload);

      expect(token).toBe("signed.session.token");
      expect(signKmsJwtMock).toHaveBeenCalledWith({
        payload: { ...payload },
        keyAlias: "SessionKey",
      });
    });
  });
});
