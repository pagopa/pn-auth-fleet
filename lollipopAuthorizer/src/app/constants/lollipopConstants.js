
// codici di errore
const VALIDATION_ERROR_CODES = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  MISSING_SIGNATURE: "MISSING_SIGNATURE",
  INVALID_SIGNATURE: "INVALID_SIGNATURE"
};

//una lista di coppie chiave-valore separate da virgole, dove:
//Chiave: Inizia con sig e cifre (sig[\d]+)
//Valore: È racchiuso tra due punti (:) e contiene caratteri Base64 ([A-Za-z0-9+/=]*)
const SIGNATURE_REGEXP = '^((sig[\\d]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$';

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

module.exports = {
  VALIDATION_ERROR_CODES,
  DEAFULT_ALG_BY_KTY,
  SIGNATURE_REGEXP
};
