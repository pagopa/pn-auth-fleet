const AssertionRefAlgorithms = {
  SHA256: {
    hashAlgorithm: "SHA_256",
    pattern: /^sha256-[A-Za-z0-9\-_=]{1,44}$/,
  },
  SHA384: {
    hashAlgorithm: "SHA_384",
    pattern: /^sha384-[A-Za-z0-9\-_=]{1,66}$/,
  },
  SHA512: {
    hashAlgorithm: "SHA_512",
    pattern: /^sha512-[A-Za-z0-9\-_=]{1,88}$/,
  },
};

const MILLISECONDS_PER_DAY = 86400000;

const BEGIN_CERTIFICATE = "-----BEGIN CERTIFICATE-----";
const END_CERTIFICATE = "-----END CERTIFICATE-----";

const JWS_ALG_MAP = {
  // EC (Elliptic Curve)
  "ecdsa-p256-sha256": "ES256",
};

const ALG_TO_KTY = {
  // EC
  ES256: "EC",
};

const WEBCRYPTO_ALG = {
  // ECDSA
  ES256: {
    kty: "EC",
    import: {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    verify: {
      name: "ECDSA",
      hash: "SHA-256",
    },
    needsDerConversion: true,
    rawLen: 32,
  },
};

module.exports = {
  AssertionRefAlgorithms,
  MILLISECONDS_PER_DAY,
  BEGIN_CERTIFICATE,
  END_CERTIFICATE,
  JWS_ALG_MAP,
  ALG_TO_KTY,
  WEBCRYPTO_ALG,
};
