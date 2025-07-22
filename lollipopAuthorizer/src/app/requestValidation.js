const { importJWK } = require('jose');

const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');

// codici di errore
const validationErrorCodes = {
  MISSING_PUBLIC_KEY: "MISSING_PUBLIC_KEY",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
};

//algoritmi predefiniti da usare in base al tipo di chiave (kty): in chiaro perchè importJWK non fa il parse del campo alg
const defaultAlgByKty = {
  EC: 'ES256',
  RSA: 'RS256',
};

async function validatePublicKey(publicKeyBase64Url) {
  // se la chiave pubblica non è presente, lanciamo un errore
  if (!publicKeyBase64Url) {
    console.error('[validatePublicKey] Chiave pubblica mancante nell’header');
    throw new LollipopRequestContentValidationException(
      validationErrorCodes.MISSING_PUBLIC_KEY,
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
      validationErrorCodes.INVALID_PUBLIC_KEY,
      'La chiave pubblica deve essere un JSON codificato in base64url'
    );
  }

  // si decide l'algoritmo da usare: se non è specificato, usiamo quello predefinito per il tipo di chiave
  const algorithmToUse = jwkObject.alg || defaultAlgByKty[jwkObject.kty];
  if (!algorithmToUse) {
    console.error('[validatePublicKey] Algoritmo mancante o non supportato per il tipo di chiave:', jwkObject.kty);
    throw new LollipopRequestContentValidationException(
      validationErrorCodes.INVALID_PUBLIC_KEY,
      `Algoritmo mancante o non supportato per il tipo di chiave ${jwkObject.kty}`
    );
  }

  try {
    // importare la JWK: se ha un formato non valido o non è supportata, viene lanciata un'eccezione
    await importJWK(jwkObject, algorithmToUse); //-> prende JWK e la trasforma in un oggetto crypto compatibile con le API della libreria jose
  } catch (err) {
    console.error('[validatePublicKey] Importazione della chiave JWK fallita:', err);
    throw new LollipopRequestContentValidationException(
      validationErrorCodes.INVALID_PUBLIC_KEY,
      'La chiave pubblica fornita ha un formato non valido o non è supportata'
    );
  }
}

module.exports = {
  validatePublicKey,
  validationErrorCodes,
  LollipopRequestContentValidationException,
};
