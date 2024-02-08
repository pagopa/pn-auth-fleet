const { AllowedIssuerDao } = require('pn-auth-common')
const { UrlDownloader } = require('pn-auth-common')



async function handleEvent(event) {
    const minimumMinutesInThePast = process.env.JWKS_REFRESH_INTERVAL_MINUTES;
    const jwksDownloadRetryIntervalMinutes = process.env.JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES;
    const date = Date.now();
    const initialTimeInMillis = date;
    let pivotTimeInMillis = date;
    let issuersToRenew = await AllowedIssuerDao.listJwksCacheExpiringAtMinute( transformInDate(pivotTimeInMillis) )
    while(issuersToRenew.length > 0 || initialTimeInMillis-pivotTimeInMillis < minimumMinutesInThePast * 60 * 1000) {
        for ( allowedIssuerToRenew of issuersToRenew ) {
            const allowedIssuerId = allowedIssuerToRenew.iss
            try {
                await AllowedIssuerDao.addJwksCacheEntry( allowedIssuerId, UrlDownloader.downloadUrl )
            }
            catch (e) {
                console.error("Error during addJwksCacheEntry for issuer " + allowedIssuerId, e)
                const rescheduleTime = pivotTimeInMillis + jwksDownloadRetryIntervalMinutes * 60 * 1000;
                await AllowedIssuerDao.postponeJwksCacheEntryValidation( allowedIssuerId, transformInDate(rescheduleTime) )
            }
        }
        pivotTimeInMillis = removeSingleMinute(pivotTimeInMillis)
        issuersToRenew = await AllowedIssuerDao.listJwksCacheExpiringAtMinute( transformInDate(pivotTimeInMillis) )
    }
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'OK' }),
    }
}

function removeSingleMinute(date) {
    return date - (1000*60)
}

function transformInDate(dateInMillis) {
    let date = new Date(dateInMillis).toISOString();
    return  date.slice(0, 16) + 'Z';
}

module.exports = { handleEvent };
