import {
  getAWSParameterStore,
  getAWSSecret,
} from "../../app/utils/AwsParameters";
import { setupEnv } from "../test.utils";

global.fetch = jest.fn();

describe("getAWSParameter", () => {
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
      json: async () => ({ SecretString: "secret-value" }),
    });

    const result = await getAWSSecret("my-secret");

    expect(result).toBe("secret-value");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:2773/secretsmanager/get?secretId=my-secret",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
  });

  it("should fetch secret binary successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ SecretBinary: "c2VjcmV0LWJpbmFyeQ==" }),
    });

    const result = await getAWSSecret("my-secret-binary");

    expect(result).toBe(JSON.stringify("c2VjcmV0LWJpbmFyeQ=="));
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:2773/secretsmanager/get?secretId=my-secret-binary",
      expect.objectContaining({
        headers: { "X-Aws-Parameters-Secrets-Token": "fake-session-token" },
      })
    );
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
});
