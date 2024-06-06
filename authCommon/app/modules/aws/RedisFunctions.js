// Create a service client module using ES6 syntax.
const { getRedisClient } = require('./Clients');
const { REDIS_KEY } = require('./constants');
const INITIAL_LOCK_TTL_SEC = parseInt(process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS) 
                           + parseInt(process.env.MAXIMUM_CLOCK_DRIFT_SEC);

let redisClient;

async function connectRedis() {
    console.log("Connecting to Redis")
    const c = await getRedisClient()
    await c.connect();
    console.log("Connection OK")
    redisClient = c;
}

async function lockFunction(iss, value){
    console.log("Acquiring lock on iss: " + iss)
    const result = await redisClient.set(REDIS_KEY + iss, value, { NX: true, EX: INITIAL_LOCK_TTL_SEC});
    console.log("Lock is " + result)
    return result === 'OK';
}

async function unlockFunction(iss, value){
    console.log("Releasing lock on iss: " + iss)
    const tmp = await redisClient.get(REDIS_KEY + iss)
    let result
    if(tmp) {
        if(tmp == value) {
            result = await redisClient.del(REDIS_KEY + iss);
            console.log("Release lock is " + result)
        }
        else {
            console.log("Value " + value + " is not consistent")
        }
    }
    else {
        console.log("Key " + iss + " is not exists")
    }
}

async function extendLockFunction(iss, value, extendTime) {
    console.log("Extending lock on iss: " + iss)
    let result = await redisClient.set(REDIS_KEY + iss, value, { XX: true, EX: extendTime});
    console.log("Extend result " + result)
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
