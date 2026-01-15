import {
  getAWSParameterStore,
  getAWSSecret,
} from "../../app/utils/AwsParameters";
import { setupEnv } from "../test.utils";

global.fetch = jest.fn();

// Mock retryWithDelay to call the function immediately without delay
jest.mock("../../app/utils/Retry.ts", () => ({
  retryWithDelay: jest.fn((fn) => fn()),
}));

describe("AwsParameters", () => {
  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
  });

  it("should fetch SSM parameter successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ Parameter: { Value: "param-value" } }),
    });

    const result = await getAWSParameterStore("/test/param");

    expect(result).toBe("param-value");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:2773/systemsmanager/parameters/get?name=%2Ftest%2Fparam",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
  });

  it("should fetch secret successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ SecretString: '{"secret-key":"my-secret-value"}' }),
    });

    const result = await getAWSSecret("my-secret");

    expect(result).toEqual({ "secret-key": "my-secret-value" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:2773/secretsmanager/get?secretId=my-secret",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
  });

  it("should handle SecretBinary when SecretString is not present", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        SecretBinary: { key: "binary-value" },
      }),
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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(getAWSParameterStore("/invalid/param")).rejects.toThrow(
      'Failed to fetch parameter "/invalid/param": 404 Not Found'
    );
  });

  it("should throw error when secret fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(getAWSSecret("/invalid/secret")).rejects.toThrow(
      'Failed to fetch secret "/invalid/secret": 404 Not Found'
    );
  });

  it("should throw error when secret JSON parsing fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ SecretString: "invalid-json{" }),
    });

    await expect(getAWSSecret("my-secret")).rejects.toThrow(
      "Failed to parse secret as JSON:"
    );
  });

  it("should handle non Error objects in JSON parsing failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ SecretString: "invalid-json{" }),
    });

    // Mock JSON.parse to throw a non Error object
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
