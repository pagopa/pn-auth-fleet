
const { RedisHandler } = require('pn-auth-common');
const { AllowedIssuerDao, UrlDownloader } = require('pn-auth-common');


const INITIAL_LOCK_TTL_SEC = process.env.JWKS_FORCE_REFRESH_LAMBDA_TIMEOUT_SECONDS 
                           + process.env.MAXIMUM_CLOCK_DRIFT_SEC;

async function handleEvent(event) {
    let issToRefresh = event.iss;
    let requestUuid = event.uuid;
    var lock;

    await RedisHandler.connectRedis()
    
    try {
        let lock = await RedisHandler.lockFunction(issToRefresh)
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