const { expect } = require("chai");
const sinon = require("sinon");
const { isJtiRevoked } = require("../app/redis");
const { RedisHandler } = require("pn-auth-common");

describe("isJtiRevoked", () => {
  const jti = "test-jti";
  const expectedKey = `pn-session:${jti}`;

  beforeEach(() => {
    sinon.stub(RedisHandler, "connectRedis").resolves();
    sinon.stub(RedisHandler, "get").resolves(null);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should call connectRedis and get with the correct key", async () => {
    await isJtiRevoked(jti);

    sinon.assert.calledOnce(RedisHandler.connectRedis); 
    sinon.assert.calledWith(RedisHandler.get, expectedKey);
  });

  it("should return true if the JTI is revoked", async () => {
    RedisHandler.get.resolves("some_value");

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
  
  it("should not call connectRedis if the client is already connected", async () => {
    const mockClient = {
      isReady: true,
    };
    sinon.stub(RedisHandler, "getClient").returns(mockClient);

    const result = await isJtiRevoked(jti);
    expect(result).to.be.false;
    sinon.assert.notCalled(RedisHandler.connectRedis);
  })
});
