import { getAWSParameter, retryWithDelay } from "../../app/utils/AwsParameters";
import { setupEnv } from "../test.utils";

global.fetch = jest.fn();

describe("retryWithDelay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return result on first success", async () => {
    const mockFn = jest.fn().mockResolvedValue("success");

    const result = await retryWithDelay(mockFn, 100, 3);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await retryWithDelay(mockFn, 100, 2);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should throw error after all retries exhausted", async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error("persistent failure"));

    await expect(retryWithDelay(mockFn, 100, 2)).rejects.toThrow(
      "persistent failure"
    );
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe("getAWSParameter", () => {
  //   let originalEnv: NodeJS.ProcessEnv;

  //   beforeAll(() => {
  //     originalEnv = { ...process.env };
  //   });

  beforeEach(() => {
    setupEnv();
    jest.clearAllMocks();
    // process.env = { ...originalEnv };
  });

  afterEach(() => {});

  it("should fetch SSM parameter successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ Parameter: { Value: "param-value" } }),
    });

    const result = await getAWSParameter("/test/param");

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

    const result = await getAWSParameter("my-secret", true);

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

    const result = await getAWSParameter("my-secret-binary", true);

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

    await expect(getAWSParameter("/test/param")).rejects.toThrow(
      "AWS_SESSION_TOKEN is not set"
    );
  });

  it("should throw error when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    });

    await expect(getAWSParameter("/test/param")).rejects.toThrow(
      "Failed to fetch parameter: Not Found"
    );
  });
});
