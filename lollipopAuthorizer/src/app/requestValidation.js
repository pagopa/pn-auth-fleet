const { importJWK } = require('jose');

const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { DEAFULT_ALG_BY_KTY, AssertionRefAlgorithms, USER_ID_REGEX, ORIGINAL_URL_REGEX, SIGNATURE_INPUT_REGEXP, SIGNATURE_REGEXP } = require('../app/constants/lollipopConstants');
const { VALIDATION_ERROR_CODES } = require('../app/constants/lollipopErrorsConstants');
const { COMPATIBLE_ASSERTION_TYPES } = require("./constants/lollipopConstants");
const { lollipopConfig } = require('./config/lollipopConsumerRequestConfig');



/**
 * Valida l'header contenente la chiave pubblica codificata in Base64Url
 *
 * -Verifica che il valore sia presente
 * -Decodifica la stringa base64url in JSON
 * -Controlla che sia una JWK valida
 * -Importa la chiave tramite la libreria `jose` per assicurarsi che il formato sia corretto
 *
 * @async
 * @param {string} publicKeyBase64Url - Chiave pubblica codificata in Base64Url contenente una JWK
 * @throws {LollipopRequestContentValidationException} Se la chiave è assente, malformata o non importabile
 */
async function validatePublicKey(publicKeyBase64Url) {
  console.log("Starting validatePublicKey...");
  // se la chiave pubblica non è presente, lanciamo un errore
  if (!publicKeyBase64Url) {
    console.error('[validatePublicKey] Chiave pubblica mancante nell’header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
      'Missing request PublicKey header'
    );
  }

  let publicKeyString =
    typeof publicKeyBase64Url === 'string'
      ? publicKeyBase64Url
      : JSON.stringify(publicKeyBase64Url);
  try {
    publicKeyString = Buffer.from(publicKeyBase64Url, 'base64').toString('utf-8');
  } catch (err) {
    console.log('Key not in Base64, uso stringa originale');
  }

  let jwkObject;
  try {
    jwkObject = JSON.parse(publicKeyString);
  } catch (err) {
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      'PublicKey JSON malformed'
    );
  }

  // si decide l'algoritmo da usare: se non è specificato, usiamo quello predefinito per il tipo di chiave
  const algorithmToUse = jwkObject.alg || DEAFULT_ALG_BY_KTY[jwkObject.kty];
  if (!algorithmToUse) {
    console.error('[validatePublicKey] Algoritmo mancante o non supportato per il tipo di chiave:', jwkObject.kty);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      `Algorithm is invalid or not supported for key ${jwkObject.kty}`
    );
  }

  try {
    // importare la JWK: se ha un formato non valido o non è supportata, viene lanciata un'eccezione
    await importJWK(jwkObject, algorithmToUse); //-> prende JWK e la trasforma in un oggetto crypto compatibile con le API della libreria jose
    console.log("Ending validatePublicKey without error");
  } catch (err) {
    console.error('[validatePublicKey] Importazione della chiave JWK fallita:', err);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
      'PublicKey not valid or usupported'
    );
  }
}

/**
 * Valida l'header assertionRef
 *
 * -Verifica che l'header sia presente
 * -Controlla che rispetti i pattern SHA256, SHA384 o SHA512
 *
 * @async
 * @param {string} assertionRef - Il valore dell'header AssertionRef
 * @throws {LollipopRequestContentValidationException} Se il valore è assente o non rispetta i pattern previsti
 */
async function validateAssertionRefHeader(assertionRef) {
  console.log("Starting validateAssertionRefHeader...");
  if (!assertionRef) {
    console.error("[validateAssertionRefHeader] Assertion header mancante");
    throw new LollipopRequestContentValidationException(VALIDATION_ERROR_CODES.MISSING_ASSERTION_REF_ERROR, "Request header AssertionRef is missing");
  }
  if (isNotValidAssertionRef(assertionRef)) {
    console.error("[validateAssertionRefHeader] Valore AssertionRef non valido");
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR,
      "AssertionRef is not valid"
    );
  }
  console.log("Ending validateAssertionRefHeader without error");
}

/**
 * Helper - Controlla se il valore dell'AssertionRef non corrisponde ai pattern SHA previsti
 *
 * @param {string} signature - Il valore da validare
 * @returns {boolean} True se NON corrisponde a nessun pattern valido
 */
function isNotValidAssertionRef(signature) {
  const matchesSHA256 = AssertionRefAlgorithms.SHA256.pattern.test(signature);
  const matchesSHA384 = AssertionRefAlgorithms.SHA384.pattern.test(signature);
  const matchesSHA512 = AssertionRefAlgorithms.SHA512.pattern.test(signature);
  return !matchesSHA256 && !matchesSHA384 && !matchesSHA512;
}

/**
 * Valida l'header assertionType
 *
 * -Verifica che il valore sia presente (può essere null)
 * -Controlla che il tipo sia incluso tra quelli supportati
 *
 * @param {string|null} assertionType - Il valore dell'header AssertionType
 * @throws {LollipopRequestContentValidationException} Se il valore è mancante o non supportato
 */
function validateAssertionTypeHeader(assertionType) {
  console.log("Starting validateAssertionTypeHeader...")
  if (assertionType === null) {
    console.error("[validateAssertionTypeHeader] Assertion type mancante");
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_ASSERTION_TYPE_ERROR,
      "Request header AssertionType is missing"
    );
  }
  if (!isAssertionTypeSupported(assertionType)) {
    console.error("[validateAssertionTypeHeader] Invalid Assertion Type Header value, type not supported");
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_ASSERTION_TYPE_ERROR,
      "Invalid AssertionType header value, type not supported"
    );
  }
  console.log("Ending validateAssertionTypeHeader without error");
}

/**
 * Helper - Verifica se il valore dell'assertionType è tra quelli compatibili
 *
 * @param {string} assertionType - Tipo da verificare
 * @returns {boolean} True se il tipo è supportato
 */
function isAssertionTypeSupported(assertionType) {
  return COMPATIBLE_ASSERTION_TYPES.includes(assertionType);
}

/**
 * Valida l'header userId
 *
 * -Verifica che il valore sia presente
 * -Converte in uppercase per la validazione
 * -Controlla che rispetti il pattern del codice fiscale
 *
 * @async
 * @param {string} userId - userId da validare
 * @throws {LollipopRequestContentValidationException} Se mancante o non valido.
 */
async function validateUserIdHeader(userId) {
  console.log("Starting validateUserIdHeader...");
  if (!userId) {
    console.error('[validateUserIdHeader] UserId mancante nell’header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_USER_ID,
      'Request header UserId is missing'
    );
  }
  const userIdUpper = userId.toUpperCase();
  //const userIdRegex =  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
  if (!USER_ID_REGEX.test(userIdUpper)) {
    console.error('[validateUserIdHeader] Invalid User Id Header value, type not supported');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_USER_ID,
      'Invalid User Id Header value, type not supported'
    );
  }
  console.log("Ending validateUserIdHeader without error");
}

/**
 * Valida l'header auth-jwt
 *
 * -Deve essere presente
 * -Non può essere una stringa vuota
 *
 * @param {string} authJWT - Il valore dell'header
 * @throws {LollipopRequestContentValidationException} Se è assente o vuoto
 */
function validateAuthJWTHeader(authJWT) {
  console.log("Starting validateUserIdHeader...");

  if (authJWT === null) {
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_AUTH_JWT,
      "Missing AuthJWT Header"
    );
  }
  if (authJWT === "") {
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_AUTH_JWT,
      "Invalid AuthJWT Header value, cannot be empty"
    );
  }
  console.log("Ending validateUserIdHeader without error");
}

/**
 * Valida l'header original-method
 *
 * -Verifica che il valore sia presente
 * -Controlla che rientri tra i metodi ammessi
 *
 * @async
 * @param {string} originalMethod - Metodo HTTP originale (es. GET, POST)
 * @throws {LollipopRequestContentValidationException} Se mancante o non incluso nella lista dei metodi validi
 */
async function validateOriginalMethodHeader(originalMethod) {
  console.log("Starting validateOriginalMethodHeader...");

  if (!originalMethod) {
    console.error('[validateOriginalMethodHeader] ERROR: originalMethod mancante nell’header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_ORIGINAL_METHOD,
      'Request header OriginalMethod is missing'
    );
  }


  const validMethods = lollipopConfig.expectedFirstLcOriginalMethod.split(';');
  if (!Object.values(validMethods).includes(originalMethod)) {
    console.error('[validateOriginalMethodHeader] ERROR: Unexpected originalMethod: "' + originalMethod + '"');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_METHOD,
      "Unexpected original method: ", originalMethod
    );
  }
  console.log("Ending validateOriginalMethodHeader without error");
}


/**
 * Valida l'header original-url
 *
 * - Verifica che sia presente
 * - Controlla che rispetti il pattern generale dell'URL
 * - Verifica che inizi con il prefisso consentito
 *
 * @async
 * @param {string} originalURL - L'URL originale
 * @throws {LollipopRequestContentValidationException} Se è mancante, non rispetta il formato previsto o non ha il prefisso corretto
 */
async function validateOriginalURLHeader(originalURL) {
  console.log("Starting validateOriginalURLHeader...")
  if (!originalURL) {
    console.error('[validateOriginalURLHeader] ERROR: Missing Original URL Header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_ORIGINAL_URL,
      'Missing Original URL Header'
    );
  }

  const regexOrig = new RegExp(ORIGINAL_URL_REGEX);
  if (!(regexOrig.test(originalURL))) {
    console.error('[validateOriginalURLHeader] ERROR: Invalid originalURL Header value, type not supported');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_ORIGINAL_URL,
      'Invalid originalURL Header value, type not supported'
    );
  }

  const regex = new RegExp(lollipopConfig.expectedFirstLcOriginalUrl);
  if (!(regex.test(originalURL))) {
    console.error('[validateOriginalURLHeader] ERROR: Unexpected original url ' + originalURL);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_URL,
      'Unexpected original url: ' + originalURL);
  }
  console.log("Ending validateOriginalURLHeader without error");
}


/**
 * Valida l'header signature-input
 *
 * - Verifica che il valore sia presente
 * - Controlla che rispetti il pattern signature-input richiesto
 *
 * @async
 * @param {string} signatureInput - Il valore dell'header signature-input
 * @throws {LollipopRequestContentValidationException} Se è assente o non valido
 */
async function validateSignatureInputHeader(signatureInput) {
  console.log("Starting validateSignatureInputHeader...");


  if (!signatureInput) {
    console.error('[validateSignatureInputHeader] ERROR: Missing Signature Input Header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_SIGNATURE_INPUT,
      'Missing Signature Input Header'
    );
  }

  const regexOrig = new RegExp(SIGNATURE_INPUT_REGEXP);
  if (!(regexOrig.test(signatureInput))) {
    console.error('[validateSignatureInputHeader] ERROR: Invalid signatureInput Header value, type not supported');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_SIGNATURE_INPUT,
      'Invalid signatureInput Header value, type not supported'
    );
  }
  console.log("Ending validateSignatureInputHeader without error");
}

/**
 * Valida l'header signature
 *
 * - Deve essere presente
 * - Deve rispettare il pattern firma previsto
 *
 * @async
 * @param {string} signature - Il valore della firma
 * @throws {LollipopRequestContentValidationException} Se mancante o non valido
 */
async function validateSignatureHeader(signature) {
  console.log("Starting validateSignatureHeader...");
  if (!signature) {
    console.error('[validateSignatureHeader] ERROR: Missing signature Header');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_SIGNATURE,
      'Missing Signature Header'
    );
  }

  const regexOrig = new RegExp(SIGNATURE_REGEXP);
  if (!(regexOrig.test(signature))) {
    console.error('[validateSignatureHeader] ERROR: Invalid signature Header value, type not supported');
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.INVALID_SIGNATURE,
      'Invalid signature Header value, type not supported'
    );
  }
  console.log("Ending validateSignatureHeader without error");
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
  validateAuthJWTHeader,
  LollipopRequestContentValidationException
};
