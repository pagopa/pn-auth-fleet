// Create a service client module using ES6 syntax.
const { S3Client } = require("@aws-sdk/client-s3");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { createClient } = require('redis');
const { Signer } = require('./Signer')
const { fromNodeProviderChain } = require("@aws-sdk/credential-providers")

const AUTHTOKEN_DURATION = 900
const REDIS_URL_CONST = 'rediss://' + process.env.REDIS_ENDPOINT + ":6379"

let redisConnection = {
  client: null,
  expiration: null
}

async function getRedisClient(forceRefresh = false){
  console.log("Get redis client with");
  if(!forceRefresh && redisConnection.client && Date.now() > redisConnection.expiration) {
    console.log("Return cached redis client");
    return redisConnection.client
  }
  else {
    console.log("Create new redis client fromNodeProviderChain");
    const credentials = await fromNodeProviderChain()()
    console.log("Credentials obtained for Redis client", credentials);
    console.log("signer with env", process.env.AWS_REGION, process.env.REDIS_SERVER_NAME, process.env.USER_ID_REDIS);
    const sign = new Signer({
      region: process.env.AWS_REGION,
      hostname: process.env.REDIS_SERVER_NAME,
      username: process.env.USER_ID_REDIS,
      credentials: credentials,
      expiresIn: AUTHTOKEN_DURATION
    });
    redisConnection.expiration = Date.now() + ((AUTHTOKEN_DURATION - 100) *1000) //seconds

    console.log("Presigned URL");
    const presignedUrl = await sign.getAuthToken();
  
    const redisConfig = {
      url: REDIS_URL_CONST,
      password: presignedUrl,
      username: process.env.USER_ID_REDIS,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    };
    console.log("Redis config", redisConfig);
    redisConnection.client = createClient(redisConfig);
    console.log("Redis client OK", redisConnection.client);
    return redisConnection.client;
  }
}

module.exports = {
  s3Client: new S3Client({}),
  sqsClient: new SQSClient({}),
  getRedisClient: getRedisClient
};