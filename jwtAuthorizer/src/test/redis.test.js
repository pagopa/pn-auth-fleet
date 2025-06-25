const { expect } = require("chai");
const sinon = require("sinon");
const { isJtiRevoked } = require("../app/redis");
const { RedisClient } = require("pn-auth-common");

describe("isJtiRevoked", () => {
  let getRedisClientStub;
  let redisClientMock;

  beforeEach(() => {
    redisClientMock = {
      isReady: true,
      connect: sinon.stub().resolves(),
      get: sinon.stub(),
    };
    getRedisClientStub = sinon.stub(RedisClient, "getRedisClient").resolves(redisClientMock);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return true if JTI is found in Redis", async () => {
    redisClientMock.get.resolves("someValue");
    const result = await isJtiRevoked("test-jti");
    expect(redisClientMock.get.calledWith("pn-session:test-jti")).to.be.true;
    expect(result).to.be.true;
  });

  it("should return false if JTI is not found in Redis", async () => {
    redisClientMock.get.resolves(null);
    const result = await isJtiRevoked("test-jti");
    expect(redisClientMock.get.calledWith("pn-session:test-jti")).to.be.true;
    expect(result).to.be.false;
  });

  it("should connect if client is not ready", async () => {
    redisClientMock.isReady = false;
    redisClientMock.get.resolves(null);
    await isJtiRevoked("test-jti");
    expect(redisClientMock.connect.calledOnce).to.be.true;
  });

  it("should return false and log error if Redis throws", async () => {
    const error = new Error("Redis error");
    redisClientMock.get.rejects(error);
    const consoleErrorStub = sinon.stub(console, "error");
    const result = await isJtiRevoked("test-jti");
    expect(result).to.be.false;
    expect(consoleErrorStub.calledWithMatch("Error checking JTI revocation:")).to.be.true;
    consoleErrorStub.restore();
  });
});