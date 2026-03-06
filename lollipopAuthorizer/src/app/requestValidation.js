import { importJWK  } from "jose";

import LollipopRequestContentValidationException from "../app/exception/lollipopRequestContentValidationException.js";
import { DEAFULT_ALG_BY_KTY, AssertionRefAlgorithms, USER_ID_REGEX, ORIGINAL_URL_REGEX, SIGNATURE_INPUT_REGEXP, SIGNATURE_REGEXP  } from "../app/constants/lollipopConstants.js";
import { VALIDATION_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import { COMPATIBLE_ASSERTION_TYPES  } from "./constants/lollipopConstants.js";
import { lollipopConfig, authorizerConfigMap, loadAuthorizerConfigMap  } from "./config/lollipopConsumerRequestConfig.js";

function findMicroserviceConfig(originalURL) {
  const configMap = authorizerConfigMap || loadAuthorizerConfigMap();
    if (!configMap || !Array.isArray(configMap)) {
        return null;
    }

    const config = configMap.find(entry =>
        originalURL.includes(entry.substringURL)
    );

    if (config) {
        console.log(`[findMicroserviceConfig] Match trovato per substringURL: "${config.substringURL}"`);
        return config;
    }

    console.error(`[findMicroserviceConfig] Nessun match trovato per URL: "${originalURL}" (${configMap.length} entry configurate)`);
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MICROSERVICE_CONFIG_NOT_FOUND,
        `No microservice configuration found for URL: ${originalURL}`
    );
}

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
    console.error('[validatePublicKey] Chiave pubblica mancante nell\'header');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
        'Missing Public Key Header'
    );
  }
  console.log("[validatePublicKey-TESTUAT] Raw publicKey value: " + publicKeyBase64Url);
  console.log("[validatePublicKey-TESTUAT] Raw publicKey length: " + publicKeyBase64Url.length);

  let publicKeyString =
      typeof publicKeyBase64Url === 'string'
          ? publicKeyBase64Url
          : JSON.stringify(publicKeyBase64Url);
  try {
    console.log("[validatePublicKey-TESTUAT] Raw publicKey encoding detection: BASE64_STANDARD, BASE64URL");
    publicKeyString = Buffer.from(publicKeyBase64Url, 'base64url').toString('utf-8');
  } catch (err) {
    console.log('Key not in Base64, uso stringa originale');
  }

  let jwkObject;
  try {
    jwkObject = JSON.parse(publicKeyString);
    console.log("[validatePublicKey-TESTUAT] Decoded publicKey (base64url->utf8): " + publicKeyString);
    console.log("[validatePublicKey-TESTUAT] JWK parsed successfully: kty=" + jwkObject.kty + ", crv=" + (jwkObject.crv || "N/A") + ", kid=" + (jwkObject.kid || "N/A"));
  } catch (err) {
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
        'Invalid Public Key Header value'
    );
  }

  // si decide l'algoritmo da usare: se non è specificato, usiamo quello predefinito per il tipo di chiave
  const algorithmToUse = jwkObject.alg || DEAFULT_ALG_BY_KTY[jwkObject.kty];
  console.log("[validatePublicKey-TESTUAT] Algorithm to use: " + algorithmToUse);
  if (!algorithmToUse) {
    console.error('[validatePublicKey] Algoritmo mancante o non supportato per il tipo di chiave:', jwkObject.kty);
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR,
        'Invalid Public Key Header value'
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
        'Invalid Public Key Header value'
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
  console.log("[validateAssertionRefHeader-TESTUAT] Raw assertionRef: " + assertionRef);
  console.log("[validateAssertionRefHeader-TESTUAT] assertionRef length: " + (assertionRef ? assertionRef.length : 0));
  if (!assertionRef) {
    console.error("[validateAssertionRefHeader] Assertion header mancante");
    throw new LollipopRequestContentValidationException(VALIDATION_ERROR_CODES.MISSING_ASSERTION_REF_ERROR, "Missing AssertionRef Header");
  }
  if (isNotValidAssertionRef(assertionRef)) {
    console.error("[validateAssertionRefHeader] Valore AssertionRef non valido");
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR,
        "Invalid AssertionRef Header value"
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
  if (assertionType == null) {
    console.error("[validateAssertionTypeHeader] Assertion type mancante");
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_ASSERTION_TYPE_ERROR,
        "Missing Assertion Type Header"
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
    console.error('[validateUserIdHeader] UserId mancante nell\'header');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_USER_ID,
        'Missing User Id Header'
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
  console.log("Starting validateAuthJWTHeader...");

  if (authJWT == null) {
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_AUTH_JWT,
        "Missing AuthJWT Header"
    );
  }
  if (authJWT.trim() === '') {
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_AUTH_JWT,
        "Invalid AuthJWT Header value, cannot be empty"
    );
  }
  console.log("Ending validateAuthJWTHeader without error");
}

/**
 * Valida l'header original-method
 *
 * - Verifica che il valore sia presente
 * - Cerca configurazione specifica per il microservizio tramite originalURL
 * - Controlla che rientri tra i metodi ammessi (specifici o globali)
 *
 * @async
 * @param {string} originalMethod - Metodo HTTP originale (es. GET, POST)
 * @param {string} originalURL - URL originale per identificare il microservizio
 * @throws {LollipopRequestContentValidationException} Se mancante o non incluso nella lista dei metodi validi
 */
async function validateOriginalMethodHeader(originalMethod, originalURL) {
  console.log("Starting validateOriginalMethodHeader...");

  if (!originalMethod) {
    console.error('[validateOriginalMethodHeader] ERROR: originalMethod mancante nell\'header');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_ORIGINAL_METHOD,
        'Missing Original Method Header'
    );
  }

  const microserviceConfig = findMicroserviceConfig(originalURL);
  
  let validMethods;
  
  if (microserviceConfig) {
    validMethods = microserviceConfig.methods;
    console.log(`[validateOriginalMethodHeader] Uso configurazione specifica per "${microserviceConfig.substringURL}": ${validMethods.join(', ')}`);
  } else {
    let expectedFirstLcOriginalMethod;
    if (process.env.EXPECTED_FIRST_LC_ORIGINAL_METHOD === undefined || 
        process.env.EXPECTED_FIRST_LC_ORIGINAL_METHOD === '') {
      expectedFirstLcOriginalMethod = lollipopConfig.expectedFirstLcOriginalMethod;
    } else {
      expectedFirstLcOriginalMethod = process.env.EXPECTED_FIRST_LC_ORIGINAL_METHOD;
    }
    validMethods = expectedFirstLcOriginalMethod.split(';');
    console.log(`[validateOriginalMethodHeader] Uso configurazione globale: ${validMethods.join(', ')}`);
  }

  if (!validMethods.includes(originalMethod)) {
    console.error(`[validateOriginalMethodHeader] ERROR: Unexpected originalMethod: "${originalMethod}" (validi: ${validMethods.join(', ')})`);
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_METHOD,
        `Unexpected original method: ${originalMethod}. Valid methods: ${validMethods.join(', ')}`
    );
  }

  console.log("Ending validateOriginalMethodHeader without error");
}


/**
 * Valida l'header original-url
 *
 * - Verifica che sia presente
 * - Controlla che rispetti il pattern generale dell'URL (formato base)
 * - Cerca configurazione specifica per il microservizio
 * - Verifica che rispetti il pattern specifico o globale
 *
 * @async
 * @param {string} originalURL - L'URL originale
 * @throws {LollipopRequestContentValidationException} Se è mancante, non rispetta il formato previsto o non ha il pattern corretto
 */
async function validateOriginalURLHeader(originalURL) {
  console.log("Starting validateOriginalURLHeader...");
  if (!originalURL) {
    console.error('[validateOriginalURLHeader] ERROR: Missing Original URL Header');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_ORIGINAL_URL,
        'Missing Original URL Header'
    );
  }

  const regexOrig = new RegExp(ORIGINAL_URL_REGEX);
  if (!regexOrig.test(originalURL)) {
    console.error('[validateOriginalURLHeader] ERROR: Invalid originalURL Header value, type not supported');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_ORIGINAL_URL,
        'Invalid Original URL Header value'
    );
  }

  const microserviceConfig = findMicroserviceConfig(originalURL);
  
  let urlPattern;
  
  if (microserviceConfig) {
    urlPattern = microserviceConfig.URLpattern;
    console.log(`[validateOriginalURLHeader] Uso URLpattern specifico per "${microserviceConfig.substringURL}": ${urlPattern}`);
  } else {
    if (process.env.EXPECTED_FIRST_LC_ORIGINAL_URL === undefined ||
        process.env.EXPECTED_FIRST_LC_ORIGINAL_URL === '') {
      urlPattern = lollipopConfig.expectedFirstLcOriginalUrl;
    } else {
      urlPattern = process.env.EXPECTED_FIRST_LC_ORIGINAL_URL;
    }
    console.log(`[validateOriginalURLHeader] Uso URLpattern globale: ${urlPattern}`);
  }

  const regex = new RegExp(urlPattern);
  if (!regex.test(originalURL)) {
    console.error(`[validateOriginalURLHeader] ERROR: Unexpected original url "${originalURL}" non match pattern "${urlPattern}"`);
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_URL,
      `Unexpected original url: ${originalURL}. Expected pattern: ${urlPattern}`
    );
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
  console.log("[validateSignatureInputHeader-TESTUAT] Raw signatureInput: " + signatureInput);


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
        'Invalid Signature Input Header value'
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
  console.log("[validateSignatureHeader-TESTUAT] Raw signature header: " + signature);
  console.log("[validateSignatureHeader-TESTUAT] Signature header length: " + (signature ? signature.length : 0));
  if (!signature) {
    console.error('[validateSignatureHeader] ERROR: Missing signature Header');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_SIGNATURE,
        'Missing Signature Header'
    );
  }

  const regexOrig = new RegExp(SIGNATURE_REGEXP);
  console.log("[validateSignatureHeader-TESTUAT] Regex test result: " + regexOrig.test(signature) + ", regex used: " + SIGNATURE_REGEXP);
  const sigParts = signature.match(/^(sig\d+)=:([A-Za-z0-9+/=_-]*):$/);
  if (sigParts) {
    const rawVal = sigParts[2];
    const hasUrlChars = /[-_]/.test(rawVal) && !/[+/]/.test(rawVal);
    const hasStdChars = /[+/]/.test(rawVal);
    const encoding = hasStdChars ? (hasUrlChars ? "BASE64_STANDARD, BASE64URL" : "DEFINITELY_BASE64_STANDARD") : "BASE64URL";
    console.log('[validateSignatureHeader-TESTUAT] label="' + sigParts[1] + '" rawValue="' + rawVal + '"');
    console.log('[validateSignatureHeader-TESTUAT] label="' + sigParts[1] + '" encoding_detection=BASE64_STANDARD, ' + encoding);
  }
  if (!(regexOrig.test(signature))) {
    console.error('[validateSignatureHeader] ERROR: Invalid signature Header value, type not supported');
    throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.INVALID_SIGNATURE,
        'Invalid Signature Header value'
    );
  }
  console.log("Ending validateSignatureHeader without error");
}

export { validatePublicKey,
  validateOriginalMethodHeader,
  validateAssertionRefHeader,
  validateAssertionTypeHeader,
  validateUserIdHeader,
  validateOriginalURLHeader,
  validateSignatureInputHeader,
  validateSignatureHeader,
  validateAuthJWTHeader,
  findMicroserviceConfig,
  LollipopRequestContentValidationException
};