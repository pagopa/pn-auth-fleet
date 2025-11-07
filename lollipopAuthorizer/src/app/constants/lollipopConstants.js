// codici di errore
const VALIDATION_ERROR_CODES = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  MISSING_USER_ID: "MISSING_USER_ID",
  INVALID_USER_ID: "INVALID_USER_ID",
};

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

const USER_ID_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

module.exports = {
  VALIDATION_ERROR_CODES,
  DEAFULT_ALG_BY_KTY,
  USER_ID_REGEX
};
