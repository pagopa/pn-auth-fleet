import { ValidationException } from "../../app/exception/validationException";
import {
  generateKoResponse,
  generateOkResponse,
  generateTokenExchangeResponse,
} from "../../app/utils/Responses";
import * as TokenGenerator from "../../app/utils/TokenGenerator";
import { mockState } from "../__mock__/event.mock";
import {
  allowedOrigin,
  makeKoResponse,
  okResponseMock,
  tokenExchangeResponse,
} from "../__mock__/responses.mock";
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
      const result = generateKoResponse(
        new Error("Generic Error"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("Generic Error", 500));
    });

    it("Role not allowed", () => {
      const result = generateKoResponse(
        new ValidationException("Role not allowed"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("Role not allowed", 403));
    });

    it("TaxId not allowed", () => {
      const result = generateKoResponse(
        new ValidationException("TaxId not allowed"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("TaxId not allowed", 451));
    });

    it("Issuer not known", () => {
      const result = generateKoResponse(
        new ValidationException("Issuer not known"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("Issuer not known", 400));
    });

    it("Invalid Audience", () => {
      const result = generateKoResponse(
        new ValidationException("Invalid Audience"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("Invalid Audience", 400));
    });

    it("Token is not valid", () => {
      const result = generateKoResponse(
        new ValidationException("Token is not valid"),
        allowedOrigin
      );

      expect(result).toEqual(makeKoResponse("Token is not valid", 400));
    });
  });

  describe("generateOkResponse", () => {
    it("Returns successful response", () => {
      const result = generateOkResponse(tokenExchangeResponse, allowedOrigin);

      expect(result).toEqual(okResponseMock);
    });
  });

  describe("generateTokenExchangeResponse", () => {
    beforeEach(() => {
      jest
        .spyOn(TokenGenerator, "generateJwtPayload")
        .mockReturnValue(payloadMock);
      jest
        .spyOn(TokenGenerator, "generateSessionToken")
        .mockResolvedValue(tokenExchangeResponse.sessionToken);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("Generates token exchange response with correct structure", async () => {
      const result = await generateTokenExchangeResponse({
        decodedIdToken: oneIdentityIdTokenMock,
        state: mockState,
      });

      expect(result).toEqual(tokenExchangeResponse);
    });
  });
});
