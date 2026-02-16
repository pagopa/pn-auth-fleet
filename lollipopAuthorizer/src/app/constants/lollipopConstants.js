//una lista di coppie chiave-valore separate da virgole, dove:
//Chiave: Inizia con sig e cifre (sig[\d]+)
//Valore: È racchiuso tra due punti (:) e contiene caratteri Base64 ([A-Za-z0-9+/=]*)
const SIGNATURE_REGEXP = '^((sig[\\d]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$';

const ORIGINAL_URL_REGEX = '^https://\\S+$';
const EXPECTED_FIRST_LC_ORIGINAL_URL = '^https://api-app.io.pagopa.it/first-lollipop/sign$';

//validare una lista di coppie chiave-valore separate da virgole:
//Inizia esattamente con sig seguito da uno o più cifre, seguito da '=' seguito da qualsiasi sequenza di caratteri tranne la virgola
//Separatore tra Coppie: Una virgola opzionale seguita da uno spazio opzionale ((, ?+)?+).
const SIGNATURE_INPUT_REGEXP = '^sig[\\d]+=([^,]+)(, ?sig[\\d]+=([^,]+))*$';

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const DEAFULT_ALG_BY_KTY = {
  EC: 'ES256',
  RSA: 'RS256',
};

const USER_ID_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

const AssertionRefAlgorithms = {
  SHA256: {
    hashAlgorithm: "SHA_256",
    pattern: /^sha256-[A-Za-z0-9\-_=]{1,44}$/
  },
  SHA384: {
    hashAlgorithm: "SHA_384",
    pattern: /^sha384-[A-Za-z0-9\-_=]{1,66}$/
  },
  SHA512: {
    hashAlgorithm: "SHA_512",
    pattern: /^sha512-[A-Za-z0-9\-_=]{1,88}$/
  },
};

const COMPATIBLE_ASSERTION_TYPES=[
    "SAML"
];

const EXPECTED_FIRST_LC_ORIGINAL_METHOD = "POST;GET";
const ASSERTION_EXPIRE_IN_DAYS = 365;
const MILLISECONDS_PER_DAY = 86400000; //24 * 60 * 60 * 1000;

const BEGIN_CERTIFICATE='-----BEGIN CERTIFICATE-----'
const END_CERTIFICATE='-----END CERTIFICATE-----'

const JWS_ALG_MAP = {
  // EC (Elliptic Curve)
  "ecdsa-p256-sha256": "ES256",
  "ecdsa-p384-sha384": "ES384",
  "ecdsa-p521-sha512": "ES512",

  // RSA-PSS
  "rsa-pss-sha256": "PS256",
  "rsa-pss-sha384": "PS384",
  "rsa-pss-sha512": "PS512",

  // RSA v1.5
  "rsa-v1_5-sha256": "RS256",
  "rsa-v1_5-sha384": "RS384",
  "rsa-v1_5-sha512": "RS512",

  // HMAC
  "hmac-sha256": "HS256",
  "hmac-sha384": "HS384",
  "hmac-sha512": "HS512",

  // EdDSA
  "ed25519": "EdDSA",
  "ed448": "EdDSA"
};


const ALG_TO_KTY = {
  // EC
  ES256: "EC",
  ES384: "EC",
  ES512: "EC",

  // RSA
  PS256: "RSA",
  PS384: "RSA",
  PS512: "RSA",
  RS256: "RSA",
  RS384: "RSA",
  RS512: "RSA",

  // HMAC (oct)
  HS256: "oct",
  HS384: "oct",
  HS512: "oct",

  // EdDSA (OKP)
  EdDSA: "OKP"
};

const WEBCRYPTO_ALG = {
  // ECDSA
  ES256: {
    kty: "EC",
    import: {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    verify: {
      name: "ECDSA",
      hash: "SHA-256"
    },
    needsDerConversion: true,
    rawLen: 32
  },

  ES384: {
    kty: "EC",
    import: {
      name: "ECDSA",
      namedCurve: "P-384"
    },
    verify: {
      name: "ECDSA",
      hash: "SHA-384"
    },
    needsDerConversion: true,
    rawLen: 48
  },

  ES512: {
    kty: "EC",
    import: {
      name: "ECDSA",
      namedCurve: "P-521"
    },
    verify: {
      name: "ECDSA",
      hash: "SHA-512"
    },
    needsDerConversion: true,
    rawLen: 66
  },
  // RSA-PSS
  PS256: {
    kty: "RSA",
    import: {
      name: "RSA-PSS",
      hash: "SHA-256"
    },
    verify: {
      name: "RSA-PSS",
      hash: "SHA-256",
      saltLength: 32
    },
    needsDerConversion: false
  },

  PS384: {
    kty: "RSA",
    import: {
      name: "RSA-PSS",
      hash: "SHA-384"
    },
    verify: {
      name: "RSA-PSS",
      hash: "SHA-384",
      saltLength: 48
    },
    needsDerConversion: false
  },

  PS512: {
    kty: "RSA",
    import: {
      name: "RSA-PSS",
      hash: "SHA-512"
    },
    verify: {
      name: "RSA-PSS",
      hash: "SHA-512",
      saltLength: 64
    },
    needsDerConversion: false
  },
  // RSA PKCS#1 v1.5
  RS256: {
    kty: "RSA",
    import: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    verify: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    needsDerConversion: false
  },

  RS384: {
    kty: "RSA",
    import: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-384"
    },
    verify: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-384"
    },
    needsDerConversion: false
  },

  RS512: {
    kty: "RSA",
    import: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-512"
    },
    verify: {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-512"
    },
    needsDerConversion: false
  },
  // EdDSA (Ed25519)
  EdDSA: {
    kty: "OKP",
    import: {
      name: "Ed25519"
    },
    verify: {
      name: "Ed25519"
    },
    needsDerConversion: false
  }
};



export { DEAFULT_ALG_BY_KTY,
  USER_ID_REGEX,
  COMPATIBLE_ASSERTION_TYPES,
  AssertionRefAlgorithms,
  EXPECTED_FIRST_LC_ORIGINAL_METHOD,
  ORIGINAL_URL_REGEX,
  EXPECTED_FIRST_LC_ORIGINAL_URL,
  SIGNATURE_INPUT_REGEXP,
  SIGNATURE_REGEXP,
  ASSERTION_EXPIRE_IN_DAYS,
  MILLISECONDS_PER_DAY,
  BEGIN_CERTIFICATE,
  END_CERTIFICATE,
  JWS_ALG_MAP,
  ALG_TO_KTY,
  WEBCRYPTO_ALG };
