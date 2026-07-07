const { KmsJwtVerifier } = require("pn-auth-common");

async function validation(jwtToken) {
  return KmsJwtVerifier.validation(jwtToken, Number(process.env.CACHE_TTL));
}

module.exports = { validation };
