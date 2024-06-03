const { redisClient } = require('pn-auth-common/aws');
const { AllowedIssuerDao, UrlDownloader } = require('pn-auth-common');
const { default: Redlock } = require("redlock");

const INITIAL_LOCK_TTL_SEC = process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS 
                           + process.env.MAXIMUM_CLOCK_DRIFT_SEC;

async function handleEvent(event) {
    let issToRefresh = event.iss;
    let requestUuid = event.uuid;
    var lock;

    console.log("Connecting to Redis...")
    await redisClient.connect();
    const redlock = new Redlock([redisClient]);
    try {
        let lock = await redlock.acquire(issToRefresh, INITIAL_LOCK_TTL_SEC)
        // Perform Redis operations
        if(lock) {
            await AllowedIssuerDao.addJwksCacheEntry(issToRefresh, UrlDownloader.downloadUrl)
            lock.extend(process.env.MINIMUM_INTERVAL_BETWEEN_FORCED_REFESH_SEC)
        }
        else {
            console.log("Lock already exists for issuer " + issToRefresh)
        }
    } catch (error) {
        lock.release();
        console.log("Error during Cache Refresh " + error);
    } finally {
        
        await redisClient.disconnect();
    }
  
    const response = {
      statusCode: 200,
      body: JSON.stringify('Redis operation completed successfully!'),
    };
    return response;
  }


module.exports = { handleEvent };