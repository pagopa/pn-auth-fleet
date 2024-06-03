// Create a service client module using ES6 syntax.
const { S3Client } = require("@aws-sdk/client-s3");
const { createClient } = require('redis');


async function initializeRedis(){
  const credentials = await fromNodeProviderChain()()
  const sign = new Signer({
    region: 'eu-south-1',
    hostname: process.env.REDIS_HOSTNAME,
    username: userId,
    credentials: credentials
  });
  const presignedUrl = await sign.getAuthToken();

  const redisConfig = {
    url: process.env.REDIS_CONNECTION_URL,
    password: presignedUrl,
    username: process.env.REDIS_USER_ID,
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  };
  
  return createClient(redisConfig);
}



exports.redisClient = initializeRedis();
exports.s3Client = new S3Client({})