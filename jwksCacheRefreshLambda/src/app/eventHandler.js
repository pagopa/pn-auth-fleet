const { AllowedIssuerDao } = require('pn-auth-common')
const { UrlDownloader } = require('pn-auth-common')
const { prepareJWKSRenewTimeMetric } = require('./modules/metric/metricsUtils')
const { MetricsHandler } = require('pn-auth-common');

const metricsHandler = new MetricsHandler();

async function handleEvent(event) {
    const minimumMinutesInThePast = parseInt(process.env.JWKS_REFRESH_INTERVAL_MINUTES) + 1;
    const jwksDownloadRetryIntervalMinutes = parseInt(process.env.JWKS_DOWNLOAD_RETRY_INTERVAL_MINUTES);
    const date = Date.now();
    const initialTimeInMillis = date;
    let pivotTimeInMillis = date;
    let issuersToRenew = await AllowedIssuerDao.listJwksCacheExpiringAtMinute(transformInDate(pivotTimeInMillis))
    console.log('Issuers to renew at ' + transformInDate(pivotTimeInMillis), issuersToRenew)
    try {
        while (issuersToRenew.length > 0 || initialTimeInMillis - pivotTimeInMillis < minimumMinutesInThePast * 60 * 1000) {
            for (const allowedIssuerToRenew of issuersToRenew) {
                const allowedIssuerId = allowedIssuerToRenew.iss
                try {
                    await AllowedIssuerDao.addJwksCacheEntry(allowedIssuerId, UrlDownloader.downloadUrl)
                    const renewTimeMetricValue = Math.floor(Date.now() / 1000) - allowedIssuerToRenew.jwksCacheOriginalExpireEpochSeconds
                    const metric = prepareJWKSRenewTimeMetric(allowedIssuerId, renewTimeMetricValue)
                    metricsHandler.addMetric(metric.metricName, metric.unit, metric.value, metric.dimension, metric.metadata)
                    console.log('JWKS cache entry added for issuer ' + allowedIssuerId)
                }
                catch (e) {
                    console.error("Error during addJwksCacheEntry for issuer " + allowedIssuerId, e)
                    const rescheduleTime = Date.now() + (jwksDownloadRetryIntervalMinutes * 60 * 1000);
                    await AllowedIssuerDao.postponeJwksCacheEntryValidation(allowedIssuerId, transformInDate(rescheduleTime))
                }
            }
            pivotTimeInMillis = removeSingleMinute(pivotTimeInMillis)
            issuersToRenew = await AllowedIssuerDao.listJwksCacheExpiringAtMinute(transformInDate(pivotTimeInMillis))
            console.log('Issuers to renew at ' + transformInDate(pivotTimeInMillis), issuersToRenew)
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'OK' }),
        }
    }
    finally {
        metricsHandler.publishMetrics()
    }
}

function removeSingleMinute(date) {
    return date - (1000 * 60)
}

function transformInDate(dateInMillis) {
    let date = new Date(dateInMillis).toISOString();
    return date.slice(0, 16) + 'Z';
}

module.exports = { handleEvent };
