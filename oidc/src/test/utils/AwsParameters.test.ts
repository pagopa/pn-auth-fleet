import axios from "axios";
import {
  getAWSParameterStore,
  getAWSSecret,
} from "../../app/handlers/oidcToken/utils/AwsParameters";
import { setupEnv } from "../test.utils";

jest.mock("axios");
jest.mock("../../app/utils/Retry.ts", () => ({
  retryWithDelay: jest.fn((fn) => fn()),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const axiosError = (status: number, statusText: string) => ({
  response: { status, statusText },
});

describe("AwsParameters", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  it("should fetch SSM parameter successfully", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { Parameter: { Value: "param-value" } },
    });

    const result = await getAWSParameterStore("/test/param");

    expect(result).toBe("param-value");
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://localhost:2773/systemsmanager/parameters/get?name=%2Ftest%2Fparam",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
  });

  it("should fetch secret successfully", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { SecretString: '{"secret-key":"my-secret-value"}' },
    });

    const result = await getAWSSecret("my-secret");

    expect(result).toEqual({ "secret-key": "my-secret-value" });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://localhost:2773/secretsmanager/get?secretId=my-secret",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
  });

  it("should handle SecretBinary when SecretString is not present", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { SecretBinary: { key: "binary-value" } },
    });

    const result = await getAWSSecret("my-secret");

    expect(result).toEqual({ key: "binary-value" });
  });

  it("should throw error when AWS_SESSION_TOKEN is missing", async () => {
    delete process.env.AWS_SESSION_TOKEN;

    await expect(getAWSParameterStore("/test/param")).rejects.toThrow(
      "AWS_SESSION_TOKEN is not set"
    );
  });

  it("should throw error when parameter fetch fails", async () => {
    mockedAxios.get.mockRejectedValue(axiosError(404, "Not Found"));

    await expect(getAWSParameterStore("/invalid/param")).rejects.toThrow(
      'Failed to fetch parameter "/invalid/param": 404 Not Found'
    );
  });

  it("should throw error when secret fetch fails", async () => {
    mockedAxios.get.mockRejectedValue(axiosError(404, "Not Found"));

    await expect(getAWSSecret("/invalid/secret")).rejects.toThrow(
      'Failed to fetch secret "/invalid/secret": 404 Not Found'
    );
  });

  it("should throw error when secret JSON parsing fails", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { SecretString: "invalid-json{" },
    });

    await expect(getAWSSecret("my-secret")).rejects.toThrow(
      "Failed to parse secret as JSON:"
    );
  });

  it("should handle non Error objects in JSON parsing failure", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { SecretString: "invalid-json{" },
    });

    const originalParse = JSON.parse;
    JSON.parse = jest.fn(() => {
      throw "Generic error";
    });

    await expect(getAWSSecret("my-secret")).rejects.toThrow(
      "Failed to parse secret as JSON: Generic error"
    );

    JSON.parse = originalParse;
  });
});
