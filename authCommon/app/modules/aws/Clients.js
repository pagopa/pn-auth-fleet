// Create a service client module using ES6 syntax.
const { S3Client } = require("@aws-sdk/client-s3");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { createClient } = require('redis');
const { Signer } = require('./Signer')

const AUTHTOKEN_DURATION = 900
const REDIS_URL_CONST = 'rediss://' + process.env.REDIS_ENDPOINT + ":6379"
let redisConnection = {
  client: null,
  expiration: null
}

async function getRedisClient(forceRefresh = false){
  if(!forceRefresh && redisConnection.client && Date.now() > redisConnection.expiration) {
    return redisConnection.client
  }
  else {
    const credentials = await fromNodeProviderChain()()
    const sign = new Signer({
      region: process.env.AWS_REGION,
      hostname: process.env.REDIS_SERVER_NAME,
      username: process.env.USER_ID_REDIS,
      credentials: credentials,
      expiresIn: AUTHTOKEN_DURATION
    });
    redisConnection.expiration = Date.now() + ((AUTHTOKEN_DURATION - 100) *1000) //seconds

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
    redisConnection.client = createClient(redisConfig);
    return redisConnection.client;
  }
}

exports.s3Client = new S3Client({})
exports.sqsClient = new SQSClient({})
exports.getRedisClient = getRedisClient
