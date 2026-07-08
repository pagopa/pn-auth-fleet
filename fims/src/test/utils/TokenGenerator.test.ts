import { signKmsJwt } from "pn-auth-common-ts";
import {
  generateFimsJwtPayload,
  generateSessionToken,
} from "../../app/handlers/fimsToken/utils/TokenGenerator";
import { setupEnv } from "../test.utils";

// The KMS signing itself lives in pn-auth-common-ts (tested there); here we only
// verify that FIMS builds the right payload and delegates with the right KEY_ALIAS.
jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  signKmsJwt: jest.fn(),
}));

const signKmsJwtMock = signKmsJwt as jest.Mock;

describe("FIMS TokenGenerator", () => {
  beforeEach(() => {
    setupEnv();
    jest.spyOn(Date, "now").mockReturnValue(1649686749000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    signKmsJwtMock.mockReset();
  });

  describe("generateFimsJwtPayload", () => {
    it("should build the payload from UserInfo claims, the cx id and the ad-hoc TTL", () => {
      const payload = generateFimsJwtPayload({
        uid: "bb4619fa-7fea-4afd-8140-5e2c72cfc4c2",
        fiscalCode: "GRBGPP87L04L741X",
        givenName: "Giuseppe Maria",
        familyName: "Garibaldi",
        state: "fake-state",
      });

      expect(payload).toEqual({
        uid: "bb4619fa-7fea-4afd-8140-5e2c72cfc4c2",
        fiscal_code: "GRBGPP87L04L741X",
        given_name: "Giuseppe Maria",
        family_name: "Garibaldi",
        state: "fake-state",
        iss: "https://webapi.dev.notifichedigitali.it", // ISSUER from setupEnv
        iat: 1649686749,
        exp: 1649686809, // iat + 60 (FIMS_TOKEN_TTL from setupEnv)
      });
    });
  });

  describe("generateSessionToken", () => {
    const payload = {
      uid: "bb4619fa-7fea-4afd-8140-5e2c72cfc4c2",
      fiscal_code: "GRBGPP87L04L741X",
      given_name: "Giuseppe Maria",
      family_name: "Garibaldi",
      state: "fake-state",
      iss: "https://webapi.dev.notifichedigitali.it",
      iat: 1649686749,
      exp: 1649686809,
    };

    it("should delegate to signKmsJwt with the payload and KEY_ALIAS from env", async () => {
      signKmsJwtMock.mockResolvedValue("signed.session.token");

      const token = await generateSessionToken(payload);

      expect(token).toBe("signed.session.token");
      expect(signKmsJwtMock).toHaveBeenCalledWith({
        payload: { ...payload },
        keyAlias: "SessionKey", // KEY_ALIAS from setupEnv
      });
    });

    it("should propagate errors from signKmsJwt", async () => {
      signKmsJwtMock.mockRejectedValue(new Error("Signing failed"));

      await expect(generateSessionToken(payload)).rejects.toThrow("Signing failed");
    });
  });
});
