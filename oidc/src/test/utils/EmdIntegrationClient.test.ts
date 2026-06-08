import axios from "axios";
import { getRetrievalPayload } from "../../app/handlers/oidcToken/utils/EmdIntegrationClient";
import {
  checkTppResponseMock,
  retrievalIdMock,
} from "../__mock__/emdIntegration.mock";
import { setupEnv } from "../test.utils";

jest.mock("aws-xray-sdk-core", () => ({
  captureHTTPsGlobal: jest.fn(),
}));
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("EMD Integration Client tests", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  it("should successfully get retrieval payload", async () => {
    mockedAxios.get.mockResolvedValue({ data: checkTppResponseMock });

    const result = await getRetrievalPayload(retrievalIdMock);

    expect(result).toBe(checkTppResponseMock);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${process.env.PN_EMD_INTEGRATION_BASEURL}/emd-integration-private/token/check-tpp?retrievalId=${retrievalIdMock}`,
      expect.objectContaining({ timeout: 2000 })
    );
  });

  it("should throw an error if response is not ok", async () => {
    mockedAxios.get.mockRejectedValue(new Error("HTTP error! status: 500"));

    await expect(getRetrievalPayload(retrievalIdMock)).rejects.toThrow(
      "Failed to retrieve TPP payload"
    );
  });

  it("should throw an error if fetch fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Error during check TPP"));

    await expect(getRetrievalPayload(retrievalIdMock)).rejects.toThrow(
      "Failed to retrieve TPP payload"
    );
  });

  it("should throw an error if PN_EMD_INTEGRATION_BASEURL is not set", () => {
    delete process.env.PN_EMD_INTEGRATION_BASEURL;

    expect(getRetrievalPayload(retrievalIdMock)).rejects.toThrow(
      "PN_EMD_INTEGRATION_BASEURL is not set"
    );
  });
});
