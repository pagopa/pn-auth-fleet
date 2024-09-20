const { AllowedIssuerDao, JwtAttributesDao, COMMON_COSTANTS, MetricsHandler } = require('pn-auth-common');


const metricsHandler = new MetricsHandler();
const METRIC_NAME = "JWKS_issuer_baselining_needed";

const MS_IN_DAY = 86400000;
const adjustDate = (d, days) => {
  if (!d)
    return;
  let millisToSec = d.getTime();
  if (days)
    millisToSec -= days * MS_IN_DAY;
  return millisToSec;
}

async function leastRecentAttributeEntry(issuer, resolver) {
  const res = await JwtAttributesDao.listJwtAttributesByIssuer(issuer, resolver);
  if (res.hasOwnProperty('modificationTimeEpochMs'))
    return res.modificationTimeEpochMs;
  else return Number.MAX_SAFE_INTEGER;
}

async function eventHandler(event) {
  const baseliningDeadline = adjustDate(new Date(), process.env.MAX_ATTRIBUTES_AGE_DAYS);

  let needBaselineCount = 0;
  let lastKey = undefined;
  try {
    do {
      const result = await AllowedIssuerDao.listRaddIssuers(lastKey);

      for (const iss of result.Items) {
        const leastRecentDatabaseAttributeTs = await leastRecentAttributeEntry(iss, COMMON_COSTANTS.RADD_RESOLVER_NAME);

        if (leastRecentDatabaseAttributeTs < baseliningDeadline) {
          // - Effettuare log a warning dell'elenco degli issuer 
          //   di cui è necessario il baselining (issuerToBeBaselined)
          console.warn("[RADD_BASELINING]", "Baselining needed for", iss);
          needBaselineCount++;
        }
      }
      lastKey = result.lastEvaluatedKey;
    } while (lastKey);
  }
  catch(e){
    console.error("[RADD_BASELINING]", e);
  }
  finally {

    // // - Emettere metrica con 
    // //   Name: “JWKS_issuer_baselining_needed”
    // //   Value: issuerToBeBaselined.size()
    // // - Effettuare flush delle metriche
    if (needBaselineCount != 0) {
      metricsHandler.addMetric(METRIC_NAME, 'count', needBaselineCount);
      metricsHandler.publishMetrics();
    }
  }
}




module.exports = { eventHandler };
