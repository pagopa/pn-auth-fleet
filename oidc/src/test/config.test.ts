import { retrieveEnvVariable } from "../app/config";
import { setupEnv } from "./test.utils";

describe("retrieveEnvVariable", () => {
  beforeEach(() => {
    jest.resetModules();
    setupEnv();
  });

  it("should return environment variable value when it exists", () => {
    process.env.ISSUER = "test_value";

    const result = retrieveEnvVariable("ISSUER");

    expect(result).toBe("test_value");
  });

  it("should throw error when environment variable is not set", () => {
    delete process.env.ISSUER;

    expect(() => retrieveEnvVariable("ISSUER")).toThrow(
      new Error("ISSUER is not set"),
    );
  });

  it("should return default value when variable is not set and default is provided", () => {
    delete process.env.ISSUER;

    const result = retrieveEnvVariable("ISSUER", "default_value");

    expect(result).toBe("default_value");
  });
});
