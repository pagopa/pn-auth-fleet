// codici di errore
const VALIDATION_ERROR_CODES = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  MISSING_ORIGINAL_URL: "MISSING_ORIGINAL_URL",
  INVALID_ORIGINAL_URL: "INVALID_ORIGINAL_URL",
  UNEXPECTED_ORIGINAL_URL: "UNEXPECTED_ORIGINAL_URL",
};

const ORIGINAL_URL_REGEX = '^https://\\S+$';
const EXPECTED_FIRST_LC_ORIGINAL_URL = '^https://api-app.io.pagopa.it/first-lollipop/sign$';

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

module.exports = {
  VALIDATION_ERROR_CODES,
  DEAFULT_ALG_BY_KTY,
  ORIGINAL_URL_REGEX,
  EXPECTED_FIRST_LC_ORIGINAL_URL
};
