// codici di errore
const VALIDATION_ERROR_CODES = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  MISSING_SIGNATURE_INPUT: "MISSING_SIGNATURE_INPUT",
  INVALID_SIGNATURE_INPUT: "INVALID_SIGNATURE_INPUT"
};

//validare una lista di coppie chiave-valore separate da virgole:
//Inizia esattamente con sig seguito da uno o più cifre, seguito da '=' seguito da qualsiasi sequenza di caratteri tranne la virgola
//Separatore tra Coppie: Una virgola opzionale seguita da uno spazio opzionale ((, ?+)?+).
const SIGNATURE_REGEXP = '^(((sig[\\d]+)=[^,]*)(, ?)?)+$';

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

module.exports = {
  VALIDATION_ERROR_CODES,
  SIGNATURE_REGEXP,
  DEAFULT_ALG_BY_KTY
};
