// codici di errore
const VALIDATION_ERROR_CODES = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  MISSING_AUTH_JWT: "MISSING_AUTH_JWT",
  INVALID_AUTH_JWT: "INVALID_AUTH_JWT",
};

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

module.exports = {
  VALIDATION_ERROR_CODES,
  DEAFULT_ALG_BY_KTY
};
