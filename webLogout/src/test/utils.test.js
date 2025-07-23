const { getCxType, getCxId, getCxRole, getParameterFromStore } = require("../app/utils");
const axios = require("axios");
jest.mock("axios");

describe("getCxType", () => {
  it("should return 'PA' when token has organization", async () => {
    const token = { organization: { id: "123", role: "admin" } };
    const result = await getCxType(token);
    expect(result).toEqual("PA");
  });

  it("should return 'PG' when token.organization.roles[0].role starts with 'pg-'", async () => {
    const token = { organization: { role: "pg-manager" } };
    const result = await getCxType(token);
    expect(result).toEqual("PG");
  });

  it("should return 'PF' when token has no organization", async () => {
    const token = { uid: "user-1" };
    const result = await getCxType(token);
    expect(result).toEqual("PF");
  });
});

describe("getCxId", () => {
  it("should return organization id if present", async () => {
    const token = { organization: { id: "org-123" }, uid: "user-1" };
    const result = await getCxId(token);
    expect(result).toEqual("org-123");
  });

  it("should return 'PF-' + uid if organization is missing", async () => {
    const token = { uid: "user-2" };
    const result = await getCxId(token);
    expect(result).toEqual("PF-user-2");
  });
});

describe("getCxRole", () => {
  it("should return the role if present", async () => {
    const token = { organization: { role: "admin" } };
    const result = await getCxRole(token);
    expect(result).toEqual("admin");
  });
  it("should return undefined if organization is missing", async () => {
    const token = {};
    const result = await getCxRole(token);
    expect(result).toBeUndefined();
  });
  it("should return undefined if organization.role is missing", async () => {
    const token = { organization: {} };
    const result = await getCxRole(token);
    expect(result).toBeUndefined();
  });
});

describe("getParameterFromStore", () => {
  beforeEach(() => {
    axios.get.mockClear();
  });

  it("getParameterFromStore - success", async () => {
    axios.get.mockResolvedValueOnce({ data: { Parameter: { Value: "fake" } } });
    const result = await getParameterFromStore("/fake-path/fake-param");
    expect(result).toEqual("fake");
  });

  it("getParameterFromStore - fail", async () => {
    axios.get.mockRejectedValue(new Error("Error in get parameter"));
    await expect(getParameterFromStore("/fake-path/fake-param")).rejects.toThrow("Error in get parameter");
    expect(axios.get).toHaveBeenCalledTimes(4); // first call + 3 retries
  });
});
