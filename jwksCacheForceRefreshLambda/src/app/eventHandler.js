
const { RedisHandler, AllowedIssuerDao, UrlDownloader } = require('pn-auth-common');

const intervalBetweenForcedRefreshSec = parseInt(process.env.MINIMUM_INTERVAL_BETWEEN_FORCED_REFRESH_SEC)

async function handleEvent(event) {
    let issToRefresh = event.iss;
    let redisValue = Date.now() + "#"+ event.uuid;

    console.log("request uuid: " + redisValue)
    await RedisHandler.connectRedis()
    try {
        let lock = await RedisHandler.lockFunction(issToRefresh, redisValue)
        // Perform Redis operations
        if(lock) {
            await AllowedIssuerDao.addJwksCacheEntry(issToRefresh, UrlDownloader.downloadUrl)
            await RedisHandler.extendLockFunction(issToRefresh, redisValue, intervalBetweenForcedRefreshSec)
        }
        else {
            console.log("Lock already exists for issuer " + issToRefresh)
        }
    } catch (error) {
        console.log("Error during Cache Refresh " + error);
        await RedisHandler.unlockFunction(issToRefresh, redisValue);
        throw new Error(error);
    } finally {
        await RedisHandler.disconnectRedis();
    }
  
    const response = {
      statusCode: 200,
      body: JSON.stringify('Redis operation completed successfully!'),
    };
    return response;
  }

module.exports = { handleEvent };