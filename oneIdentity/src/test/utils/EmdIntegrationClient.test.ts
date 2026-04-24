import { getRetrievalPayload } from "../../app/utils/EmdIntegrationClient";
import {
  checkTppResponseMock,
  retrievalIdMock,
} from "../__mock__/emdIntegration.mock";
import { setupEnv } from "../test.utils";

global.fetch = jest.fn();

describe("EMD Integration Client tests", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  it("should successfully get retrieval payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => checkTppResponseMock,
    });

    const result = await getRetrievalPayload(retrievalIdMock);

    expect(result).toBe(checkTppResponseMock);
    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.PN_EMD_INTEGRATION_BASEURL}/emd-integration-private/token/check-tpp?retrievalId=${retrievalIdMock}`,
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("should throw an error if response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getRetrievalPayload(retrievalIdMock)).rejects.toThrow(
      "Failed to retrieve TPP payload"
    );
  });

  it("should throw an error if fetch fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("Error during check TPP")
    );

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
