const EC_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "FqFDuwEgu4MUXERPMVL-85pGv2D3YmL4J1gfMkdbc24",
  y: "hdV0oxmWFSxMoJUDpdihr76rS8VRBEqMFebYyAfK9-k"
};

const RSA_JWK = {
  alg: "RS256",
  e: "65537",
  kty: "RSA",
  n: "16664736175603627996319962836030881026179675012391119517975514948152431214653585662880486636564539745534321011181408561816254231231298259205135081219875827651147217038442994953270212442857910417611387549687536933145745249602198835932059392377695498325446146715840517338191125529557810596070318285357964276748438650077150378696894010172596714187128214451872453277619054588751139432194135913672107689362828514055714059473608142304229480488308405791341245363647711560656764853819020066812645413910427819478301754525254844345246642430554339909098721902422359723272095429198014557278590405542226255562568066559844209030611"
};

// costanti utili ai test (fittizie)
const VALIDATION_PARAMS = {
  PUBLIC_KEY_HEADER: "x-pagopa-lollipop-public-key",
  ASSERTION_REF_HEADER: "x-pagopa-lollipop-assertion-ref",
  VALID_ASSERTION_REF_SHA256: "sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKsFasfcI-Dg",
  VALID_ASSERTION_REF_SHA384: "sha384-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKsFasfcIhGBHtygYgftrfvUUbhitgS-Dg",
  VALID_ASSERTION_REF_SHA512: "sha512-nX5CfUc5R-FoYKYZwvQMuc4Tt-heb7vHi_O-AMUSqHNVCw9kNaN2SVuN-DXtGXyUhrcVcQdCyY6FVzl_vyWXNA",
  INVALID_ASSERTION_REF_SHA: "sha256-invalid@@@",
  VALID_ASSERTION_TYPE:"SAML",
  INVALID_ASSERTION_TYPE:"INVALID",
  MISSING_ASSERTION_TYPE:null,
  VALID_FISCAL_CODE: "AAAAAA89S20I111X",
  VALID_JWT: "aValidJWT",
  VALID_ORIGINAL_URL: "https://api-app.io.pagopa.it/first-lollipop/sign",
  VALID_SIGNATURE_INPUT:
                "sig1=(\"content-digest\" \"x-pagopa-lollipop-original-method\""
                    + " \"x-pagopa-lollipop-original-url\");created=1678293988;nonce=\"aNonce\";alg=\"ecdsa-p256-sha256\";keyid=\"sha256-a7qE0Y0DyqeOFFREIQSLKfu5WlbckdxVXKFasfcI-Dg\"",
   VALID_SIGNATURE: "sig1=:lTuoRytp53GuUMOB4Rz1z97Y96gfSeEOm/xVpO39d3HR6lLAy4KYiGq+1hZ7nmRFBt2bASWEpen7ov5O4wU3kQ==:"
};

const PUBLIC_KEY_HEADER = "x-pagopa-lollipop-public-key";



//una lista di coppie chiave-valore separate da virgole, dove:
//Chiave: Inizia con sig e cifre (sig[\d]+)
//Valore: È racchiuso tra due punti (:) e contiene caratteri Base64 ([A-Za-z0-9+/=]*)
const SIGNATURE_REGEXP = '^((sig[\\d]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$';

const EXPECTED_FIRST_LC_ORIGINAL_METHOD = "POST";


const ORIGINAL_URL_REGEX = '^https://\\S+$';
const EXPECTED_FIRST_LC_ORIGINAL_URL = '^https://api-app.io.pagopa.it/first-lollipop/sign$';

const AssertionRefAlgorithms = {
  SHA256: { pattern: /^sha256-[A-Za-z0-9_-]{44}$/ },
  SHA384: { pattern: /^sha384-[A-Za-z0-9_-]{66}$/ },
  SHA512: { pattern: /^sha512-[A-Za-z0-9_-]{88}$/ },
};

const VALIDATION_AUTH_JWT = {
  VALID: "VALID_AUTH_JWT",
  EMPTY: "",
  MISSING: null,
}

//validare una lista di coppie chiave-valore separate da virgole:
//Inizia esattamente con sig seguito da uno o più cifre, seguito da '=' seguito da qualsiasi sequenza di caratteri tranne la virgola
//Separatore tra Coppie: Una virgola opzionale seguita da uno spazio opzionale ((, ?+)?+).
const SIGNATURE_INPUT_REGEXP = '^(((sig[\\d]+)=[^,]*)(, ?)?)+$';

module.exports = {
  EC_JWK,
  RSA_JWK,
  PUBLIC_KEY_HEADER,
  VALIDATION_PARAMS,
  AssertionRefAlgorithms,
  VALIDATION_AUTH_JWT,
  EXPECTED_FIRST_LC_ORIGINAL_METHOD,
  ORIGINAL_URL_REGEX,
  EXPECTED_FIRST_LC_ORIGINAL_URL,
  SIGNATURE_INPUT_REGEXP,
  SIGNATURE_REGEXP
};
