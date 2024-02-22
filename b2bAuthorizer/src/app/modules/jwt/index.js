const jsonwebtoken = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const JwtEssentialFields = require('../../types/JwtEssentialFields');
const AuthenticationError = require("../../errors/AuthenticationError");

class JwtService {

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
      const jwks = JSON.parse(jwksCacheItem.JWKSBody)
      validKeys = validKeys.concat(jwks.keys.filter(key => key.kid === keyId))
    })  

    return validKeys
  }

  validateToken(issuerInfo, decodedJwtToken, jwt, lambdaEvent){
    // validate aud
    if(!decodedJwtToken.payload.aud){
      throw new AuthenticationError("Audience not found in JWT");
    }
    const lambdaEventDomain = lambdaEvent?.requestContext?.domainName; 
    if(decodedJwtToken.payload.aud !== 'https://'+lambdaEventDomain){
      throw new AuthenticationError("Audience not matching the domainName");
    }

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
        });
        validated = true;
        break;
      } catch (err) {
        console.error("Error validating token with keyId: "+keyId, err);
      }
    }

    if(!validated) {
      throw new AuthenticationError("Unable to validate token with any of the keys");
    }
  }

  extractEssentialFields(decodedJwtToken){
    return JwtEssentialFields.fromJWT(decodedJwtToken);
  }
}
module.exports = JwtService;