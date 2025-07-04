const { expect } = require("chai");
const sinon = require("sinon");
const { isJtiRevoked } = require("../app/redis");
const { RedisHandler, COMMON_CONSTANTS } = require("pn-auth-common");

describe("isJtiRevoked", () => {
  const jti = "test-jti";

  beforeEach(() => {
    sinon.stub(RedisHandler, "connectRedis").resolves();
    sinon.stub(RedisHandler, "disconnectRedis").resolves();
    sinon.stub(RedisHandler, "get").resolves(null);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should call connectRedis and get with the correct key", async () => {
    const expectedKey = `${COMMON_CONSTANTS.REDIS_PN_SESSION_PREFIX}${jti}`;

    await isJtiRevoked(jti);

    sinon.assert.calledOnce(RedisHandler.connectRedis);
    sinon.assert.calledWith(RedisHandler.get, expectedKey);
    sinon.assert.calledOnce(RedisHandler.disconnectRedis);
  });

  it("should return true if the JTI is revoked", async () => {
    RedisHandler.get.resolves("1");

    const result = await isJtiRevoked(jti);
    expect(result).to.be.true;
  });

  it("should return false if the JTI is not revoked", async () => {
    RedisHandler.get.resolves(null);

    const result = await isJtiRevoked(jti);
    expect(result).to.be.false;
  });

  it("should return false and log an error if Redis throws", async () => {
    RedisHandler.get.rejects(new Error("Redis failure"));

    const result = await isJtiRevoked(jti);
    expect(result).to.be.false;
  });
});
