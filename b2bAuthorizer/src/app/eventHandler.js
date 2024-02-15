const IssuersLocalCache = require("./modules/cache/IssuersLocalCache");
const AttributeResolversMap = require("./modules/attributeResolvers/AttributeResolversMap");
const Logger = require("./modules/logger");
const JwtService = require("./modules/jwt");
const PolicyService = require("./modules/policy");
const AuthenticationError = require("./errors/AuthenticationError");

// cache initialization
const renewTimeSeconds = parseInt(process.env.RENEW_TIME_SECONDS);
const internalCacheTtlSeconds = parseInt(process.env.INTERNAL_CACHE_TTL_SECONDS);
const issuersCache = new IssuersLocalCache( 
  renewTimeSeconds,         
  internalCacheTtlSeconds 
);

// attribute resolvers map
const attributeResolvers = new AttributeResolversMap();

// jwt Service initialization
const jwtService = new JwtService();

const getJWTFromLambdaEvent = (lambdaEvent) => {
  return lambdaEvent?.authorizationToken?.replace("Bearer ", "");
}

const prepareContextForLogger = (lambdaEvent) => {
  const context = {
    stageVariables: lambdaEvent?.stageVariables,
    traceId: lambdaEvent?.headers?.["X-Amzn-Trace-Id"],
    path: lambdaEvent?.path,
    method: lambdaEvent?.httpMethod,
    domainName: lambdaEvent?.requestContext?.domainName,
  }
  return context;
}

async function handleEvent(event) {
  const jwtToken = getJWTFromLambdaEvent(event);
  const authorizationContex = prepareContextForLogger(event);
  const logger = new Logger(authorizationContex);
  const policyService = new PolicyService(logger);

  try {

    if (!jwtToken) {
      console.warn("jwtToken is null");
      throw new Error("JWT Token not found in Authorization header");
    }

    const decodedJwtToken = jwtService.decodeToken(jwtToken);

    const issuerId = decodedJwtToken.payload.iss;
    if(!issuerId) {
      logger.addToContext('jwt', decodedJwtToken);
      throw new Error("Issuer not found in JWT");
    }

    let issuerInfo = await issuersCache.getOrLoad( issuerId )
    logger.addToContext('issuerInfo', issuerInfo);
    try {
      jwtService.validateToken( issuerInfo, decodedJwtToken, jwtToken, event );  // throw AutenticationError if something goes wrong
    }
    catch (err) {
      if(err instanceof AuthenticationError){
        issuerInfo = await issuersCache.getWithForceRefresh( issuerId )
        logger.addToContext('issuerInfo', issuerInfo);
        jwtService.validateToken( issuerInfo, decodedJwtToken, jwtToken, event );  // throw AutenticationError if something goes wrong
      } else {
        throw err;
      }
    }
    
    const simpleJwt = jwtService.extractEssentialFields( decodedJwtToken )
    logger.addToContext('simpleJwt', simpleJwt);

    const attributeResolution = await attributeResolvers.resolveAttributes( simpleJwt, event, issuerInfo.cfg.attributeResolversCfgs );
    logger.addToContext('attributeResolution', attributeResolution);
    const context = attributeResolution.context;
    const usageIdentifierKey = attributeResolution.usageIdentifierKey;
    
    const policyDocument = policyService.generatePolicyDocument( context, event )
    logger.addToContext('policyDocument', policyDocument);

    logger.log("Authorization flow complete")

    return {
      principalId: "user-" + decodedJwtToken.payload.jti,
      policyDocument: policyDocument,
      context: context,
      usageIdentifierKey: usageIdentifierKey
    }

  } catch(e){
    logger.error(e.message, e);
    throw e;
  }
}

module.exports = { handleEvent };
