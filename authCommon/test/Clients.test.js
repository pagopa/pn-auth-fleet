const { rewire } = require("rewire");
const { getRedisClient } = require("../app/modules/aws/Clients");
const { expect } = require("chai");
const { Hash } = require('@aws-sdk/hash-node');

describe('Clients method', () => {
    
    it('should getRedisClient', async () => {
      const configuration = {
          region: 'us-west-2',
          credentials: {
            accessKeyId: 'FAKE_ACCESS_KEY_ID',
            secretAccessKey: 'FAKE_SECRET_ACCESS_KEY'
          },
          username: 'test-user',
          expiresIn: 3600,
          sha256: Hash.bind(null, 'sha256') // Example, you can use any sha256 implementation
        };
        

      const redisClient = await getRedisClient()
      expect(redisClient).be.not.undefined
    })

});