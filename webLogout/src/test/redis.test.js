const { insertJti } = require("./../app/redis");
const pnAuthCommon = require("pn-auth-common");

jest.mock("pn-auth-common", () => ({
  RedisClient: {
    getRedisClient: jest.fn(),
  },
}));

describe("insertJti", () => {
  const mockSet = jest.fn();
  const mockConnect = jest.fn();

  const mockClient = {
    isReady: false,
    connect: mockConnect,
    set: mockSet,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pnAuthCommon.RedisClient.getRedisClient.mockResolvedValue(mockClient);
  });

  it("should call client.set with correct parameters", async () => {
    const jti = "abc123";

    await insertJti(jti);

    expect(mockConnect).toHaveBeenCalledWith();

    expect(mockSet).toHaveBeenCalledWith("pn-session:abc123", "1", { EX: 12 * 3600 });
  });
});
