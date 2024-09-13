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

async function eventHandler( event ) {
  console.log(process.env.MAX_ATTRIBUTES_AGE_DAYS);
    const baseliningDeadline = adjustDate(new Date(), process.env.MAX_ATTRIBUTES_AGE_DAYS);
    console.log("baselined",baseliningDeadline);
    const allIssuers = await AllowedIssuerDao.listRaddIssuers();  

    const issuersToBeChecked = allIssuers;
    
    let issuerToBeBaselined = []
    for (const iss of issuersToBeChecked) {
      const leastRecentDatabaseAttributeTs = await leastRecentAttributeEntry(iss, COMMON_COSTANTS.RADD_RESOLVER_NAME);
      
      if( leastRecentDatabaseAttributeTs < baseliningDeadline ) {
        issuerToBeBaselined.push( iss )
      }
    }
    
    
    
    // // - Emettere metrica con 
    // //   Name: “JWKS_issuer_baselining_needed”
    // //   Value: issuerToBeBaselined.size()
    // // - Effettuare flush delle metriche
    if(issuerToBeBaselined.length != 0) {
        metricsHandler.addMetric(METRIC_NAME, 'count', issuerToBeBaselined.length);
        metricsHandler.publishMetrics();
        // - Effettuare log a warning dell'elenco degli issuer 
        //   di cui è necessario il baselining (issuerToBeBaselined)
        issuerToBeBaselined.forEach(currIssuer => console.warn("[RADD_BASELINING]", "Baselining needed for", currIssuer.iss));
    }
  }
  
  
  async function leastRecentAttributeEntry( issuer, resolver ) {
    const res = await JwtAttributesDao.listJwtAttributesByIssuer( issuer, resolver );
    if (res.hasOwnProperty('modificationTimeEpochMs'))
        return res.modificationTimeEpochMs;
    else return Number.MAX_SAFE_INTEGER;
    
     
  }
  
  module.exports = { eventHandler };
