import { retrieveEnvVariable } from "../Env";

describe("retrieveEnvVariable", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("should return the value when set", () => {
    process.env.MY_VAR = "my-value";
    expect(retrieveEnvVariable("MY_VAR")).toBe("my-value");
  });

  it("should return the default when not set", () => {
    delete process.env.MY_VAR;
    expect(retrieveEnvVariable("MY_VAR", "fallback")).toBe("fallback");
  });

  it("should throw when not set and no default is provided", () => {
    delete process.env.MY_VAR;
    expect(() => retrieveEnvVariable("MY_VAR")).toThrow("MY_VAR is not set");
  });
});
