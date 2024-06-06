// Create a service client module using ES6 syntax.
const { getRedisClient } = require('./Clients');

const INITIAL_LOCK_TTL_SEC = parseInt(process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS) 
                           + parseInt(process.env.MAXIMUM_CLOCK_DRIFT_SEC);
             
let redisClient;

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function prepareTtlInUnixLikeMs(date, ttlSec) {
    return date + (ttlSec * 1000)
}

async function connectRedis() {
    console.log("Connecting to Redis")
    const c = await getRedisClient()
    await c.connect();
    console.log("Connection OK")
    redisClient = c;
}

async function lockFunction(iss){
    console.log("Acquiring lock on iss: " + iss)
    const result = await redisClient.set("b2bauth:" + iss, 'locked', { NX: true, PXAT: prepareTtlInUnixLikeMs(Date.now(), INITIAL_LOCK_TTL_SEC)});
    console.log("Lock is " + result)
    return result === 'OK';
}

async function unlockFunction(iss){
    console.log("Release lock on iss: " + iss)
    const value = await redisClient.get("b2bauth:" + iss)
    let result
    if(value) {
        result = await redisClient.del("b2bauth:" + iss);
    }
    console.log("Release lock is " + result)
}

async function extendLockFunction(iss, extendTime) {
    console.log("Extending lock on iss: " + iss)
    let ttl = await redisClient.ttl("b2bauth:" + iss);
    let result = await redisClient.set("b2bauth:" + iss, 'locked', { XX: true, PXAT: prepareTtlInUnixLikeMs(ttl, extendTime)});
    console.log("Extend is " + result)
    return result === 'OK';
}

async function disconnectRedis(){
    console.log("Disconnecting to Redis")
    await redisClient.disconnect()
    console.log("Disconnection OK")
    redisClient = null;
}

module.exports = {
    connectRedis,
    lockFunction,
    disconnectRedis,
    unlockFunction,
    extendLockFunction
};
