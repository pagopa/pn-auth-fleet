const { importJWK } = require('jose');

const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { VALIDATION_ERROR_CODES, DEAFULT_ALG_BY_KTY, AssertionRefAlgorithms, USER_ID_REGEX, EXPECTED_FIRST_LC_ORIGINAL_METHOD, ORIGINAL_URL_REGEX, EXPECTED_FIRST_LC_ORIGINAL_URL, SIGNATURE_INPUT_REGEXP, SIGNATURE_REGEXP } = require('../app/constants/lollipopConstants');
const {COMPATIBLE_ASSERTION_TYPES} = require("./constants/lollipopConstants");


async function validatePublicKey(publicKeyBase64Url) {
  // se la chiave pubblica non è presente, lanciamo un errore
  if (!publicKeyBase64Url) {
    console.error('[validatePublicKey] Chiave pubblica mancante nell’header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
      'Manca la chiave pubblica nell’header della richiesta'
    );
  }

  let jwkObject;
  try {
    // decode della stringa base64url e parse in JSON
    const jsonString = Buffer.from(publicKeyBase64Url, 'base64url').toString('utf-8');
    jwkObject = JSON.parse(jsonString);
  } catch (err) {
    console.error('[validatePublicKey] Codifica base64url non valida o JSON malformato');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      'La chiave pubblica deve essere un JSON codificato in base64url'
    );
  }

  // si decide l'algoritmo da usare: se non è specificato, usiamo quello predefinito per il tipo di chiave
  const algorithmToUse = jwkObject.alg || DEAFULT_ALG_BY_KTY[jwkObject.kty];
  if (!algorithmToUse) {
    console.error('[validatePublicKey] Algoritmo mancante o non supportato per il tipo di chiave:', jwkObject.kty);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      `Algoritmo mancante o non supportato per il tipo di chiave ${jwkObject.kty}`
    );
  }

  try {
    // importare la JWK: se ha un formato non valido o non è supportata, viene lanciata un'eccezione
    await importJWK(jwkObject, algorithmToUse); //-> prende JWK e la trasforma in un oggetto crypto compatibile con le API della libreria jose
  } catch (err) {
    console.error('[validatePublicKey] Importazione della chiave JWK fallita:', err);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      'La chiave pubblica fornita ha un formato non valido o non è supportata'
    );
  }
}

//VALIDATE ASSERTION REF HEADER
async function validateAssertionRefHeader(assertionRef) {
console.log("ASSERTION REF: ", assertionRef)
    if(!assertionRef){
    console.error("[validateAssertionRefHeader] Assertion header mancante");
    throw new LollipopRequestContentValidationException(VALIDATION_ERROR_CODES.MISSING_ASSERTION_REF_ERROR, "Header AssertionRef mancante");
    }
    if (isNotValidAssertionRef(assertionRef)) {
        console.error("[validateAssertionRefHeader] Valore AssertionRef non valido");
        throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR,
            "Valore AssertionRef non valido"
        );
    }
}
// check se assertionRef è compatibile con i pattern validi
function isNotValidAssertionRef(signature) {
    const matchesSHA256 = AssertionRefAlgorithms.SHA256.pattern.test(signature);
    const matchesSHA384 = AssertionRefAlgorithms.SHA384.pattern.test(signature);
    const matchesSHA512 = AssertionRefAlgorithms.SHA512.pattern.test(signature);
    return !matchesSHA256 && !matchesSHA384 && !matchesSHA512;
}

// VALIDATE ASSERTION TYPE HEADER
function validateAssertionTypeHeader(assertionType) {
    if (assertionType===null) {
        console.error("[validateAssertionTypeHeader] Assertion type mancante");
        throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.MISSING_ASSERTION_TYPE_ERROR,
            "[validateAssertionTypeHeader] Header AssertionType mancante"
        );
    }
    if (!isAssertionTypeSupported(assertionType)){
        console.error("[validateAssertionTypeHeader] Invalid Assertion Type Header value, type not supported");
        throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.INVALID_ASSERTION_TYPE_ERROR,
            "[validateAssertionTypeHeader] Invalid Assertion Type Header value, type not supported"
        );
    }
}

function isAssertionTypeSupported(assertionType) {
    return COMPATIBLE_ASSERTION_TYPES.includes(assertionType);
}


   async function validateUserIdHeader(userId){
      // se userId non è presente, lanciamo un errore
      if (!userId) {
        console.error('[validateUserIdHeader] UserId mancante nell’header');
        throw new LollipopRequestContentValidationException(
          VALIDATION_ERROR_CODES.MISSING_USER_ID,
          'Manca lo userId nell’header della richiesta'
        );
      }
      // Converto in maiuscolo per la verifica
      const userIdUpper = userId.toUpperCase();
      //const userIdRegex =  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
      if ( !USER_ID_REGEX.test(userIdUpper) ) {
          console.error('[validateUserIdHeader] Invalid User Id Header value, type not supported');
          throw new LollipopRequestContentValidationException(
                VALIDATION_ERROR_CODES.INVALID_USER_ID,
                'Invalid User Id Header value, type not supported'
          );
      }
    }


function validateAuthJWTHeader(authJWT){
  if (authJWT===null) {
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_AUTH_JWT,
        "[validateAuthJWTHeader] Missing Auth JWT Header"
    );
  }
  if (authJWT===""){
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_AUTH_JWT,
        "[validateAuthJWTHeader] Invalid Auth JWT Header value, cannot be empty"
    );
  }
}


    async function validateOriginalMethodHeader(originalMethod){
        // se originalMethod non è presente, lanciamo un errore
        if (!originalMethod) {
            console.error('[validateOriginalMethodHeader] ERROR: originalMethod mancante nell’header');
            throw new LollipopRequestContentValidationException(
              VALIDATION_ERROR_CODES.MISSING_ORIGINAL_METHOD,
              'Manca originalMethod nell’header della richiesta'
            );
        }


        const validMethods = EXPECTED_FIRST_LC_ORIGINAL_METHOD.split(';');
        if (!Object.values(validMethods).includes(originalMethod)) {
            console.error('[validateOriginalMethodHeader] ERROR: Unexpected originalMethod: "' + originalMethod + '"');
            throw new LollipopRequestContentValidationException(
                 VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_METHOD,
                 "Unexpected original method: ", originalMethod
            );
        }

    }



async function validateOriginalURLHeader( originalURL){
    if (!originalURL) {
        console.error('[validateOriginalURLHeader] ERROR: Missing Original URL Header');
        throw new LollipopRequestContentValidationException(
          VALIDATION_ERROR_CODES.MISSING_ORIGINAL_URL,
          'Missing Original URL Header'
        );
    }

    const regexOrig = new RegExp(ORIGINAL_URL_REGEX);
    if ( !(regexOrig.test(originalURL)) ) {
      console.error('[validateOriginalURLHeader] ERROR: Invalid originalURL Header value, type not supported');
      throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.INVALID_ORIGINAL_URL,
            'Invalid originalURL Header value, type not supported'
      );
    }

    const regex = new RegExp(EXPECTED_FIRST_LC_ORIGINAL_URL);
    if( !(regex.test(originalURL)) ){
        console.error('[validateOriginalURLHeader] ERROR: Unexpected original url ' + originalURL);
        throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_URL,
            'Unexpected original url: ' + originalURL);
    }
}



async function validateSignatureInputHeader(signatureInput){

    if (!signatureInput) {
        console.error('[validateSignatureInputHeader] ERROR: Missing Signature Input Header');
        throw new LollipopRequestContentValidationException(
          VALIDATION_ERROR_CODES.MISSING_SIGNATURE_INPUT,
          'Missing Signature Input Header'
        );
    }

    const regexOrig = new RegExp(SIGNATURE_INPUT_REGEXP);
    if ( !(regexOrig.test(signatureInput)) ) {
      console.error('[validateSignatureInputHeader] ERROR: Invalid signatureInput Header value, type not supported');
      throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.INVALID_SIGNATURE_INPUT,
            'Invalid signatureInput Header value, type not supported'
      );
    }

}

async function validateSignatureHeader(signature){
    if (!signature) {
        console.error('[validateSignatureHeader] ERROR: Missing signature Header');
        throw new LollipopRequestContentValidationException(
          VALIDATION_ERROR_CODES.MISSING_SIGNATURE,
          'Missing Signature Header'
        );
    }

    const regexOrig = new RegExp(SIGNATURE_REGEXP);
    if ( !(regexOrig.test(signature)) ) {
      console.error('[validateSignatureHeader] ERROR: Invalid signature Header value, type not supported');
      throw new LollipopRequestContentValidationException(
            VALIDATION_ERROR_CODES.INVALID_SIGNATURE,
            'Invalid signature Header value, type not supported'
      );
    }



}

module.exports = {
  validatePublicKey,
  validateOriginalMethodHeader,
  validateAssertionRefHeader,
  validateAssertionTypeHeader,
  validateUserIdHeader,
  validateOriginalURLHeader,
  validateSignatureInputHeader,
  validateSignatureHeader,
  LollipopRequestContentValidationException,
  validateAuthJWTHeader
};
