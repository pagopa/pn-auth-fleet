// Create a service client module using ES6 syntax.
const { S3Client } = require("@aws-sdk/client-s3");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { createClient } = require('redis');

async function initializeRedis(){
  const credentials = await fromNodeProviderChain()()
  const sign = new Signer({
    region: process.env.AWS_REGION,
    hostname: process.env.REDIS_HOSTNAME,
    username: process.env.USER_ID_REDIS,
    credentials: credentials
  });
  const presignedUrl = await sign.getAuthToken();

  const redisConfig = {
    url: process.env.REDIS_ENDPOINT,
    password: presignedUrl,
    username: process.env.USER_ID_REDIS,
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  };
  
  return createClient(redisConfig);
}

exports.s3Client = new S3Client({})
exports.sqsClient = new SQSClient({})
exports.redisClient = initializeRedis();
