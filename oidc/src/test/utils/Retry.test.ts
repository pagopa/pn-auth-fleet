import { retryWithDelay } from "../../app/utils/Retry";

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
