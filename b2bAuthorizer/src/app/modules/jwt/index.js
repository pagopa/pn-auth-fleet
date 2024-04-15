const jsonwebtoken = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const JwtEssentialFields = require('../../types/JwtEssentialFields');
const AuthenticationError = require("../../errors/AuthenticationError");

class JwtService {

  #maxAge; // seconds
  #clockTolerance; // seconds

  constructor(maxAge, clockTolerance){
    this.#maxAge = maxAge;
    this.#clockTolerance = clockTolerance;
  }

  decodeToken(jwt){
    const decodedToken = jsonwebtoken.decode(jwt, { complete: true });
    if(!decodedToken){
      throw new Error("Unable to decode input JWT string");
    }

    return decodedToken;
  }

  #findValidKeys(keyId, jwksCache){
    let validKeys = []
    jwksCache.forEach(jwksCacheItem => {
      const buff = Buffer.from(jwksCacheItem.JWKSBody);
      const jwksBody = buff.toString();
      const jwks = JSON.parse(jwksBody)
      validKeys = validKeys.concat(jwks.keys.filter(key => key.kid === keyId))
    })  

    return validKeys
  }

  #isSignatureError(jsonWebTokenError){
    if(jsonWebTokenError.name === "JsonWebTokenError" && jsonWebTokenError.message === "invalid signature"){
      return true;
    }

    return false
  }

  validateToken(issuerInfo, decodedJwtToken, jwt, lambdaEvent){
    // validate aud
    if(!decodedJwtToken.payload.aud){
      throw new AuthenticationError("Audience not found in JWT", {}, false);
    }
    const lambdaEventDomain = lambdaEvent?.requestContext?.domainName; 
    
    const keyId = decodedJwtToken.header.kid;
    const validKeys = this.#findValidKeys(keyId, issuerInfo.jwksCache)
    let validated = false;

    for(let i=0; i<validKeys.length; i++){
      const pem = jwkToPem(validKeys[i]);
      try {
        jsonwebtoken.verify(jwt, pem, { 
          algorithms: ['RS256'],
          issuer: issuerInfo.cfg.iss,
          audience: 'https://'+lambdaEventDomain,
          clockTolerance: this.#clockTolerance, // seconds
          maxAge: this.#maxAge // seconds
        });
        validated = true;
        break;
      } catch (err) {
        console.warn("Error validating token with keyId: "+keyId, {
          err,
          jwks: validKeys[i]
        });

        if( ! this.#isSignatureError(err) ){
          throw new AuthenticationError("Error validating token with keyId: "+keyId+": "+err.message, {
            err,
            jwks: validKeys[i]
          }, false); // generate a not retriable error
        }
      }
    }

    if(!validated) {
      throw new AuthenticationError("Unable to validate token with any of the keys", {
        validKeys
      }); // this is a retriable error
    }
  }

  extractEssentialFields(decodedJwtToken){
    return JwtEssentialFields.fromJWT(decodedJwtToken);
  }
}
module.exports = JwtService;