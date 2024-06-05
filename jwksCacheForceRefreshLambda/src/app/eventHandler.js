
const { RedisHandler } = require('pn-auth-common');
const { AllowedIssuerDao, UrlDownloader } = require('pn-auth-common');

const intervalBetweenForcedRefreshSec = parseInt(process.env.MINIMUM_INTERVAL_BETWEEN_FORCED_REFESH_SEC)

async function handleEvent(event) {
    let issToRefresh = event.iss;
    let requestUuid = event.uuid;
    var lock;

    console.log("request uuid: " + requestUuid)
    await RedisHandler.connectRedis()
    try {
        let lock = await RedisHandler.lockFunction(issToRefresh)
        // Perform Redis operations
        if(lock) {
            await AllowedIssuerDao.addJwksCacheEntry(issToRefresh, UrlDownloader.downloadUrl)
            await lock.extend(intervalBetweenForcedRefreshSec)
        }
        else {
            console.log("Lock already exists for issuer " + issToRefresh)
        }
    } catch (error) {
        await lock.release();
        console.log("Error during Cache Refresh " + error);
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