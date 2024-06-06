const { expect } = require("chai");
const rewire = require("rewire");
const eventHandlerModule = rewire("../app/eventHandler");

describe("test eventHandler success", () => {

  it("should eventHandler with success", async () => {
    const event = {
        "iss": "dev-issuer.dev2.notifichedigitali.it",
        "requestTimestamp": "2024-06-05T10:38:49.283Z",
        "uuid": "639efa7e-8321-473c-bf84-c4fe1ba69e52"
    }
    const connectRedisStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.connectRedis', connectRedisStub);

    const lockFunctionStub = async () => {
      return true
    }
    eventHandlerModule.__set__('RedisHandler.lockFunction', lockFunctionStub);

    const extendLockFunctionStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.extendLockFunction', extendLockFunctionStub);

    const disconnectFunctionStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.disconnectRedis', disconnectFunctionStub);


    const allowedIssuerDaoMock = {
      listJwksCacheExpiringAtMinute: async () => {
          if(callCount != 1) {
              callCount++;
              var res = []
              res.push(issuer)
              return res
          }
          else {
              return []
          }
      },
      addJwksCacheEntry: async () => {}
  };
  const UrlDownloaderMock = {
      downloadUrl: async () => {}
  };

    eventHandlerModule.__set__('AllowedIssuerDao', allowedIssuerDaoMock);
    eventHandlerModule.__set__('UrlDownloader', UrlDownloaderMock);
    const response = await eventHandlerModule.handleEvent(event);
    const responseMock = {
      statusCode: 200,
      body: JSON.stringify('Redis operation completed successfully!'),
    };
    expect(response).to.deep.equal(responseMock)
  })

  it("should get locked issuer", async () => {
    const event = {
        "iss": "dev-issuer.dev2.notifichedigitali.it",
        "requestTimestamp": "2024-06-05T10:38:49.283Z",
        "uuid": "639efa7e-8321-473c-bf84-c4fe1ba69e52"
    }
    const connectRedisStub = async () => {
        return redis.createClient()    
    }
    eventHandlerModule.__set__('RedisHandler.connectRedis', connectRedisStub);

    const lockFunctionStub = async () => {
      return false
    }
    eventHandlerModule.__set__('RedisHandler.lockFunction', lockFunctionStub);

    const extendLockFunctionStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.extendLockFunction', extendLockFunctionStub);

    const disconnectFunctionStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.disconnectRedis', disconnectFunctionStub);


    const allowedIssuerDaoMock = {
      listJwksCacheExpiringAtMinute: async () => {
          if(callCount != 1) {
              callCount++;
              var res = []
              res.push(issuer)
              return res
          }
          else {
              return []
          }
      },
      addJwksCacheEntry: async () => {}
  };
  const UrlDownloaderMock = {
      downloadUrl: async () => {}
  };

    eventHandlerModule.__set__('AllowedIssuerDao', allowedIssuerDaoMock);
    eventHandlerModule.__set__('UrlDownloader', UrlDownloaderMock);
    const response = await eventHandlerModule.handleEvent(event);
    const responseMock = {
      statusCode: 200,
      body: JSON.stringify('Redis operation completed successfully!'),
    };
    expect(response).to.deep.equal(responseMock)
  })

  it("should get fails and get exception issuer", async () => {
    const event = {
        "iss": "dev-issuer.dev2.notifichedigitali.it",
        "requestTimestamp": "2024-06-05T10:38:49.283Z",
        "uuid": "639efa7e-8321-473c-bf84-c4fe1ba69e52"
    }
    const connectRedisStub = async () => {
        return redis.createClient()    
    }
    eventHandlerModule.__set__('RedisHandler.connectRedis', connectRedisStub);

    const lockFunctionStub = async () => {
      throw new Error("Error")
    }
    eventHandlerModule.__set__('RedisHandler.lockFunction', lockFunctionStub);

    const unlockFunctionStub = async () => {}
    eventHandlerModule.__set__('RedisHandler.unlockFunction', unlockFunctionStub);
    
    try {
      await eventHandlerModule.handleEvent(event)
    }
    catch (error) {
      expect(error).to.deep.equal(new Error("Error"))
    }
  })
});
