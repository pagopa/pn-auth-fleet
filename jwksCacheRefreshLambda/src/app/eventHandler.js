const { AllowedIssuerDao } = require('pn-auth-common')
const { UrlDownloader } = require('pn-auth-common')

const JWKS_REFRESH_INTERVAL_MINUTES = process.env.JWKS_REFRESH_INTERVAL_MINUTES ? parseInt(process.env.JWKS_REFRESH_INTERVAL_MINUTES) : 2;

async function handleEvent(event) {
    const date = Date.now();
    const initialTimeInMillis = date;
    let pivotTimeInMillis = date;
    let issuersToRenew = await AllowedIssuerDao.listJwksCacheExpiringAtMinute( transformInDate(pivotTimeInMillis) )
    while(issuersToRenew.length > 0 || initialTimeInMillis-pivotTimeInMillis < JWKS_REFRESH_INTERVAL_MINUTES * 60 * 1000) {
        for ( allowedIssuerToRenew of issuersToRenew ) {
            const allowedIssuerId = allowedIssuerToRenew.hashKey.split('~')[1]
            try {
                await AllowedIssuerDao.addJwksCacheEntry( allowedIssuerId, UrlDownloader.downloadUrl )
            }
            catch (e) {
                console.error("Error during addJwksCacheEntry for issuer " + allowedIssuerId, e)
                const rescheduleTime = pivotTimeInMillis + JWKS_REFRESH_INTERVAL_MINUTES * 60 * 1000;
                await AllowedIssuerDao.postponeJwksCacheEntryValidation( allowedIssuerToRenew.hashKey, transformInDate(rescheduleTime) )
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
