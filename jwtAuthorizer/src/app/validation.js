const { KmsJwtVerifier } = require("pn-auth-common");

async function validation(jwtToken) {
  return KmsJwtVerifier.validation({
    jwtToken,
    cacheTTL: Number(process.env.CACHE_TTL),
    debug: true,
  });
}

module.exports = { validation };
