import { ValidationException } from "pn-auth-common-ts";
import { generateTokenExchangeResponse } from "../../app/handlers/oidcToken/utils/Responses";
import * as TokenGenerator from "../../app/handlers/oidcToken/utils/TokenGenerator";
import { generateKoResponse, generateOkResponse, generateRedirectResponse } from "../../app/utils/Responses";
import { mockState } from "../__mock__/event.mock";
import { allowedOrigin, makeKoResponse, okResponseMock, tokenExchangeResponse } from "../__mock__/responses.mock";
import { oneIdentityIdTokenMock, payloadMock } from "../__mock__/token.mock";
import { setupEnv } from "../test.utils";

describe("Responses Tests", () => {
  beforeAll(() => {
    setupEnv();
  });

  describe("generateKoResponse", () => {
    it("Generic string error", () => {
      const result = generateKoResponse("Some server error", allowedOrigin);

      expect(result).toEqual(makeKoResponse("Some server error", 500));
    });

    it("Generic error", () => {
      const result = generateKoResponse(new Error("Generic Error"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("Generic Error", 500));
    });

    it("Role not allowed", () => {
      const result = generateKoResponse(new ValidationException("Role not allowed"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("Role not allowed", 403));
    });

    it("TaxId not allowed", () => {
      const result = generateKoResponse(new ValidationException("TaxId not allowed"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("TaxId not allowed", 451));
    });

    it("Issuer not known", () => {
      const result = generateKoResponse(new ValidationException("Issuer not known"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("Issuer not known", 400));
    });

    it("Invalid Audience", () => {
      const result = generateKoResponse(new ValidationException("Invalid Audience"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("Invalid Audience", 400));
    });

    it("Token is not valid", () => {
      const result = generateKoResponse(new ValidationException("Token is not valid"), allowedOrigin);

      expect(result).toEqual(makeKoResponse("Token is not valid", 400));
    });
  });

  describe("generateOkResponse", () => {
    it("Returns successful response", () => {
      const result = generateOkResponse(tokenExchangeResponse, allowedOrigin);

      expect(result).toEqual(okResponseMock);
    });
  });

  describe("generateRedirectResponse", () => {
    it("Returns 302 with Location and Access-Control-Expose-Headers", () => {
      const location = "https://example.com/auth/callback?code=abc";
      const result = generateRedirectResponse(location, allowedOrigin);

      expect(result.statusCode).toBe(302);
      expect(result.headers["Location"]).toBe(location);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe(allowedOrigin);
      expect(result.headers["Access-Control-Expose-Headers"]).toBe("Location");
    });
  });

  describe("generateTokenExchangeResponse", () => {
    beforeEach(() => {
      jest.spyOn(TokenGenerator, "generateJwtPayload").mockReturnValue(payloadMock);
      jest.spyOn(TokenGenerator, "generateSessionToken").mockResolvedValue(tokenExchangeResponse.sessionToken);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("Generates token exchange response with correct structure", async () => {
      const result = await generateTokenExchangeResponse({
        decodedIdToken: oneIdentityIdTokenMock,
        state: mockState,
        oidcStateData: {
          idp: "https://id.lepida.it/idp/shibboleth",
          nonce: "mock-nonce",
        },
      });

      expect(result).toEqual(tokenExchangeResponse);
    });

    it("includes aar in response when oidcState contains aar", async () => {
      const result = await generateTokenExchangeResponse({
        decodedIdToken: oneIdentityIdTokenMock,
        state: mockState,
        oidcStateData: {
          idp: "https://id.lepida.it/idp/shibboleth",
          nonce: "mock-nonce",
          aar: "some-aar-value",
        },
      });

      expect(result.aar).toBe("some-aar-value");
      expect(result.retrievalId).toBeUndefined();
    });

    it("includes retrievalId in response when oidcState contains retrievalId", async () => {
      const result = await generateTokenExchangeResponse({
        decodedIdToken: oneIdentityIdTokenMock,
        state: mockState,
        oidcStateData: {
          idp: "https://id.lepida.it/idp/shibboleth",
          nonce: "mock-nonce",
          retrievalId: "some-retrieval-id",
        },
      });

      expect(result.retrievalId).toBe("some-retrieval-id");
      expect(result.aar).toBeUndefined();
    });
  });
});
