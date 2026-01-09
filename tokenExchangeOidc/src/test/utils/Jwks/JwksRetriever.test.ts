import { getJwks } from "../../../app/utils/Jwks/JwksRetriever";
import { mockJwksResponse } from "../../__mock__/jwks.mock";
import { setupEnv } from "../../test.utils";

jest.mock("aws-xray-sdk-core", () => ({
  captureHTTPsGlobal: jest.fn(),
}));

jest.mock("../../../app/utils/Retry", () => ({
  retryWithDelay: jest.fn((fn) => fn()),
}));

global.fetch = jest.fn();

const mockJwksEndpoint = "https://uat.oneid.pagopa.it/oidc/keys";

describe("retrieverJwks", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  describe("getJwks", () => {
    it("should successfully fetch and return JWKS", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockJwksResponse,
      });

      const result = await getJwks();

      expect(fetch).toHaveBeenCalledWith(mockJwksEndpoint, {
        signal: expect.any(AbortSignal),
      });
      expect(result).toEqual(mockJwksResponse);
    });

    it("should throw error when fetch fails with HTTP error", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(getJwks()).rejects.toThrow("Error in get pub key");
      expect(fetch).toHaveBeenCalledWith(mockJwksEndpoint, {
        signal: expect.any(AbortSignal),
      });
    });
  });
});
