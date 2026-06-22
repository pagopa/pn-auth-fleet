import axios from "axios";
import { getJwks } from "../../../app/handlers/oidcToken/utils/Jwks/JwksRetriever";
import { mockJwksResponse } from "../../__mock__/jwks.mock";
import { setupEnv } from "../../test.utils";

jest.mock("aws-xray-sdk-core", () => ({
  captureHTTPsGlobal: jest.fn(),
}));

jest.mock("pn-auth-common-ts", () => ({
  __esModule: true,
  ...jest.requireActual("pn-auth-common-ts"),
  retryWithDelay: jest.fn((fn) => fn()),
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockJwksEndpoint = "https://uat.oneid.pagopa.it/oidc/keys";

describe("retrieverJwks", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  describe("getJwks", () => {
    it("should successfully fetch and return JWKS", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockJwksResponse });

      const result = await getJwks();

      expect(mockedAxios.get).toHaveBeenCalledWith(mockJwksEndpoint, {
        timeout: 2000,
      });
      expect(result).toEqual(mockJwksResponse);
    });

    it("should throw error when fetch fails with HTTP error", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Internal Server Error"));

      await expect(getJwks()).rejects.toThrow("Error in get pub key");
      expect(mockedAxios.get).toHaveBeenCalledWith(mockJwksEndpoint, {
        timeout: 2000,
      });
    });
  });
});
