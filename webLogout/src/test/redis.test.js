const { insertJti } = require("./../app/redis");
const pnAuthCommon = require("pn-auth-common");

jest.mock("pn-auth-common", () => ({
  ...jest.requireActual("pn-auth-common"),
  RedisHandler: {
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
    set: jest.fn(),
  },
}));

describe("insertJti", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call redis functions with correct parameters", async () => {
    const jti = "abc123";

    await insertJti(jti);

    expect(pnAuthCommon.RedisHandler.connectRedis).toHaveBeenCalledWith();
    expect(pnAuthCommon.RedisHandler.set).toHaveBeenCalledWith("pn-session::abc123", "1", { EX: 12 * 3600 });
    expect(pnAuthCommon.RedisHandler.disconnectRedis).toHaveBeenCalled();
  });

  it("should handle errors during redis operations", async () => {
    const jti = "errorJti";
    const errorMessage = "Redis error";

    pnAuthCommon.RedisHandler.set.mockRejectedValue(new Error(errorMessage));

    await expect(insertJti(jti)).rejects.toThrow(errorMessage);
  });
});
