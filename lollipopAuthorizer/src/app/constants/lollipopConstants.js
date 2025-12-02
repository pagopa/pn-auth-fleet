//una lista di coppie chiave-valore separate da virgole, dove:
//Chiave: Inizia con sig e cifre (sig[\d]+)
//Valore: È racchiuso tra due punti (:) e contiene caratteri Base64 ([A-Za-z0-9+/=]*)
const SIGNATURE_REGEXP = '^((sig[\\d]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$';

const ORIGINAL_URL_REGEX = '^https://\\S+$';
const EXPECTED_FIRST_LC_ORIGINAL_URL = '^https://api-app.io.pagopa.it/first-lollipop/sign$';

//validare una lista di coppie chiave-valore separate da virgole:
//Inizia esattamente con sig seguito da uno o più cifre, seguito da '=' seguito da qualsiasi sequenza di caratteri tranne la virgola
//Separatore tra Coppie: Una virgola opzionale seguita da uno spazio opzionale ((, ?+)?+).
const SIGNATURE_INPUT_REGEXP = '^(((sig[\\d]+)=[^,]*)(, ?)?)+$';

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

const USER_ID_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

const AssertionRefAlgorithms = {
  SHA256: { pattern: /^sha256-[A-Za-z0-9\-_=]{1,44}$/ },
  SHA384: { pattern: /^sha384-[A-Za-z0-9\-_=]{1,66}$/ },
  SHA512: { pattern: /^sha512-[A-Za-z0-9\-_=]{1,88}$/ },
};

const COMPATIBLE_ASSERTION_TYPES=[
    "SAML"
];

const EXPECTED_FIRST_LC_ORIGINAL_METHOD = "POST;GET";
const MILLISECONDS_PER_DAY = 86400000; //24 * 60 * 60 * 1000;

module.exports = {
  DEAFULT_ALG_BY_KTY,
  USER_ID_REGEX,
  COMPATIBLE_ASSERTION_TYPES,
  AssertionRefAlgorithms,
  EXPECTED_FIRST_LC_ORIGINAL_METHOD,
  ORIGINAL_URL_REGEX,
  EXPECTED_FIRST_LC_ORIGINAL_URL,
  SIGNATURE_INPUT_REGEXP,
  SIGNATURE_REGEXP,
  MILLISECONDS_PER_DAY
};
