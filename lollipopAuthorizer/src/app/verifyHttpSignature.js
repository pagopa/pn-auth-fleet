const { flattenedVerify, importJWK } = require('jose');
const base64url = require('base64url');
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { lollipopConfig, VISMA_TO_JWS_ALG } = require('./constants/lollipopConstants');
const { VERIFY_HTTP_ERROR_CODES, VALIDATION_ERROR_CODES } = require('./constants/lollipopErrorsConstants');


async function verifyHttpSignature(signature, signatureInput, parameters) {
  // rimozione degli header di firma dalla base string:
  // signature e signature-input non devono essere inclusi nella costruzione del payload firmato
  delete parameters[lollipopConfig.signatureInputHeader];
  delete parameters[lollipopConfig.signatureHeader];

  // estrazione della chiave pubblica in jwk fornita tramite header
  const lollipopKey = parameters[lollipopConfig.publicKeyHeader];
  if (!lollipopKey) {
    throw new LollipopRequestContentValidationException(
      VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
      "Lollipop publicKey header not found"
    );
  }

  // parsing del jwk codificato base64
  // se fallisce si deve restituire INVALID_JWK
  let jwkJson;
  try {
    jwkJson = JSON.parse(Buffer.from(lollipopKey, 'base64').toString('utf8'));
  } catch (err) {
    throw new LollipopRequestContentValidationException(
      VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
      `Errore parsing JWK: ${err.message}`
    );
  }

  // suddivisione di signature e signature-input in più voci nel caso di multi-firma
  const signatures = signature.split(',').map(s => s.trim());
  const signatureInputs = signatureInput.split(',').map(s => s.trim());

  // se il numero non coincide
  if (signatures.length !== signatureInputs.length) {
    throw new LollipopRequestContentValidationException(
      VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER,
      "Headers signature and signature-input have different length"
    );
  }

  // verifico ogni coppia firma/signature-input indipendentemente
  for (let i = 0; i < signatures.length; i++) {
    const sig = signatures[i];
    const sigInput = signatureInputs[i];

    // la label è la parte prima del "=" (es: sig1=...)
    const label = sig.split('=')[0];

    // estrazione dei parametri dal signature-input tramite regex:
    // alg, created, keyid, nonce, expires
    const signatureParams = parseSignatureInput(sigInput);

    let jwsAlg;

    // se alg è presente, va mappato verso l'algoritmo jws corrispondente
    // se la mappatura non esiste
    if (signatureParams.alg) {
      jwsAlg = VISMA_TO_JWS_ALG[signatureParams.alg.toLowerCase()];
      if (!jwsAlg) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_ALG,
          `Unsupported algorithm "${signatureParams.alg}" for label ${label}`
        );
      }
    } else {
      // se alg è assente
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_ALG,
        `INVALID_SIGNATURE_ALG for label ${label}: missing alg in signature-input`
      );
    }

    // solo ec e rsa sono supportati per l'importazione con jose.importJWK
    if (!['EC', 'RSA'].includes(jwkJson.kty)) {
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
        `Unsupported key type: ${jwkJson.kty} for label ${label}`
      );
    }

    // importazione della chiave jwk usando l'algoritmo determinato sopra
    // se fallisce, deve essere INVALID_JWK
    let jwkKey;
    try {
      jwkKey = await importJWK(jwkJson, jwsAlg);
    } catch (err) {
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
        `Errore import JWK: ${err.message}`
      );
    }

    // estrazione della firma:
    // rimuoviamo ":" iniziali/finali secondo la sintassi "sig1=:<base64>:"
    let sigB64 = sig.split('=')[1].replace(/^:/, '').replace(/:$/, '');

    // per le firme ec, il formato è r||s e va convertito in der prima della verifica jws
    if (jwkJson.kty === 'EC') {
      sigB64 = ecdsaRSigToDER(sigB64);
    }

    // costruzione del protected header jws
    // viene codificato in base64url e passato come "protected" nel flattened jws
    const protectedHeader = {};
    if (jwsAlg) protectedHeader.alg = jwsAlg;
    if (signatureParams.keyId) protectedHeader.kid = signatureParams.keyId;
    if (signatureParams.created) protectedHeader.created = signatureParams.created;

    // costruzione del payload della firma: base string + signature-params
    const flattenedJws = {
      protected: base64url.encode(JSON.stringify(protectedHeader)),
      payload: base64url.encode(getSignatureBase(parameters, signatureParams)),
      signature: sigB64
    };

    // verifica jws
    try {
      await flattenedVerify(flattenedJws, jwkKey);
    } catch (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('unsupported algorithm')) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_ALG,
          `INVALID_SIGNATURE_ALG for label ${label}: ${err.message}`
        );
      }

      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
        `INVALID_SIGNATURE for label ${label}: ${err.message}`
      );
    }
  }
  // se tutte le firme sono valide, si restituisce true
  return true;
}


// conversione delle firme ec da formato r||s a der
// jose richiede il formato der per le firme ec, quindi va effettuata la riconversione
function ecdsaRSigToDER(sigB64) {
  const buf = Buffer.from(sigB64, 'base64');
  const len = buf.length / 2;
  const r = buf.slice(0, len);
  const s = buf.slice(len);

  // il formato der richiede che gli interi non inizino con bit di segno
  const constructInteger = i => (i[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), i]) : i);
  const rDer = constructInteger(r);
  const sDer = constructInteger(s);

  // costruzione del der completo (sequence)
  const der = Buffer.concat([
    Buffer.from([0x30]),
    Buffer.from([rDer.length + sDer.length + 4]),
    Buffer.from([0x02]),
    Buffer.from([rDer.length]),
    rDer,
    Buffer.from([0x02]),
    Buffer.from([sDer.length]),
    sDer
  ]);

  return base64url.encode(der);
}


/**  estrae alg, created, expires, nonce e keyid dal signature-input.
 questo metodo svolge l'operazione inversa di quella che fa la libreria visma:
 mentre visma costruisce un StructuredInnerList con parametri strutturati
 (alg -> string, created/expires → integer, nonce/keyid -> string),
 qui la stringa signature-input è già serializzata e noi estraiamo gli stessi
parametri tramite regex per riutilizzarli nella verifica.function parseSignatureInput(signatureInput) {
**/
function parseSignatureInput(signatureInput) {
  const algMatch = signatureInput.match(/alg="(.*?)"/);
  const createdMatch = signatureInput.match(/created=(\d+)/);
  const expiresMatch = signatureInput.match(/expires=(\d+)/);
  const nonceMatch = signatureInput.match(/nonce="(.*?)"/);
  const keyIdMatch = signatureInput.match(/keyid="(.*?)"/);

  return {
    alg: algMatch ? algMatch[1] : null,
    created: createdMatch ? parseInt(createdMatch[1], 10) : null,
    expires: expiresMatch ? parseInt(expiresMatch[1], 10) : null,
    nonce: nonceMatch ? nonceMatch[1] : null,
    keyId: keyIdMatch ? keyIdMatch[1] : null
  };
}


/**
 * costruisce la base string per la firma http riproducendo la logica della libreria visma:
 * in visma viene iterata la lista di componenti, ciascuno produce "nome: valore\n",
 * e alla fine viene aggiunto il derived component "@signature-params" serializzato.
 * qui facciamo lo stesso con gli header rimanenti: concatenazione "header: valore\n"
 * seguita dall'aggiunta del campo "@signature-params" serializzato a json 
 * */ 
function getSignatureBase(headers, signatureParams) {
  let base = '';
  for (const name of Object.keys(headers)) {
    base += `${name}: ${headers[name]}\n`;
  }

  const params = {};
  for (const key in signatureParams) {
    if (signatureParams[key] !== undefined && signatureParams[key] !== null) {
      params[key] = signatureParams[key];
    }
  }
  base += `"@signature-params": ${JSON.stringify(params)}`;
  return base;
}


module.exports = {
  verifyHttpSignature,
  LollipopRequestContentValidationException
};
