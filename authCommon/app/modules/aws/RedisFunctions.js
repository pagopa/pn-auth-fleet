// Create a service client module using ES6 syntax.
const { getRedisClient } = require('./Clients');
const { Redlock } = require('@sesamecare-oss/redlock');

const INITIAL_LOCK_TTL_SEC = parseInt(process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS) 
                           + parseInt(process.env.MAXIMUM_CLOCK_DRIFT_SEC);
             
let redisClient;

async function connectRedis() {
    console.log("Connecting to Redis")
    const c = await getRedisClient()
    await c.connect();
    redisClient = c;
}

async function lockFunction(iss){
    const redlock = new Redlock([redisClient]);
    console.log("Acquiring lock on iss: " + iss)
    const lock = await redlock.acquire(iss, INITIAL_LOCK_TTL_SEC)
    return lock;
}

async function disconnectRedis(){
    console.log("Disonnecting to Redis")
    await redisClient.disconnect()
    redisClient = null;
}

module.exports = {
    connectRedis,
    lockFunction,
    disconnectRedis
};
