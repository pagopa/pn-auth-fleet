const { AllowedIssuerDao } = require('pn-auth-common');
const { MetricsHandler } = require('pn-auth-common');

const metricsHandler = new MetricsHandler();
const METRIC_NAME = "JWKS_issuer_baselining_needed";

async function eventHandler(  ) {
  
    const baseliningDeadline = Clock.now() - process.env.MAX_ATTRIBUTES_AGE_DAYS;
    
    const allIssuers = await AllowedIssuerDao.listRaddIssuers();  
    const issuersToBeChecked = allIssuers;
    
    let issuerToBeBaselined = []
    for (const iss of issuersToBeChecked) {
      const leastRecentDatabaseAttributeTs = leastRecentAttributeEntry( iss, 'DATABASE')
      if( leastRecentDatabaseAttributeTs < baseliningDeadline ) {
        issuerToBeBaselined.push( iss )
      }
    }
    
    
    // - Emettere metrica con 
    //   Name: “JWKS_issuer_baselining_needed”
    //   Value: issuerToBeBaselined.size()
    // - Effettuare flush delle metriche
    if(issuerToBeBaselined.length != 0) {
        metricsHandler.addMetric(METRIC_NAME, 'count', issuerToBeBaselined.length);
        metricsHandler.publishMetrics();
        // - Effettuare log a warning dell'elenco degli issuer 
        //   di cui è necessario il baselining (issuerToBeBaselined)
        issuerToBeBaselined.forEach(currIssuer => console.warn("[RADD_BASELINING]", "Baselining needed for", currIssuer.iss));
    }
  }
  
  async function leastRecentAttributeEntry( issuer, resolver ) {
    return await JwtAttributesDao.listJwtAttributesByIssuer( issuer, resolver )
           .map( el => el.modificationTimeEpochMs).min();
  }
  
  module.exports = { handleEvent };
