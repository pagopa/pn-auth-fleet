const { webcrypto } = require('crypto');
const { subtle } = webcrypto;
const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { JWS_ALG_MAP, ALG_TO_KTY, WEBCRYPTO_ALG } = require('./constants/lollipopConstants');
const { lollipopConfig } = require("./config/lollipopConsumerRequestConfig")
const { VERIFY_HTTP_ERROR_CODES, VALIDATION_ERROR_CODES } = require('./constants/lollipopErrorsConstants');


/**
 * Verifica la signature HTTP basata su signature-input e headers
 *
 * @param {string} signature - Header Signature (contenente le firme)
 * @param {string} signatureInput - Header Signature-Input (descrive i componenti firmati)
 * @param {Object<string, string>} headers - Mappa di headers HTTP
 * @returns {Promise<boolean>} True se tutte le firme sono verificate correttamente
 * @throws {LollipopRequestContentValidationException} Se la verifica fallisce o JWK/alg non sono validi
 */
async function verifyHttpSignature(signature, signatureInput, headers) {
  console.log("[verifyHttpSignature] START validation for signature");

  try {
    // copia headers 
    const headersCopy = { ...headers };
    delete headersCopy[lollipopConfig.signatureInputHeader];
    delete headersCopy[lollipopConfig.signatureHeader];

    // estrazione jwk
    const lollipopKey = headers[lollipopConfig.publicKeyHeader];
    if (!lollipopKey) {
      throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
        "Lollipop publicKey header not found"
      );
    }

    let jwk;
    try {
      jwk = JSON.parse(Buffer.from(lollipopKey, "base64").toString("utf8"));
    } catch (err) {
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
        `Invalid JWK: ${err.message}`
      );
    }

    // split per pulire signature/signature-input
    const signatures = signature.split(",").map(s => s.trim());
    const signatureInputs = signatureInput.split(",").map(s => s.trim());

    //verifica che signature e signatureinputs abbiano la stessa lunghezza
    if (signatures.length !== signatureInputs.length) {
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER,
        "Length of signatures and signature-inputs mismatch"
      );
    }

    // label -> signature
    const signatureMap = new Map();
    for (const s of signatures) {
      const idx = s.indexOf("=");
      const label = s.substring(0, idx);
      const value = s.substring(idx + 1).replace(/^:|:$/g, "");
      signatureMap.set(label, value);
    }

    // ciclo sulle firme per controllarne  la validità
    for (let i = 0; i < signatureInputs.length; i++) {
      const sigInput = signatureInputs[i];
      const label = signatures[i].split("=")[0];
      const sigB64 = signatureMap.get(label);

      if (!sigB64) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature not found for label ${label}`
        );
      }

      // parse signature-input
      const { alg } = parseSignatureInput(sigInput);
      if (!alg) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          "Missing algorithm"
        );
      }

      // controlli su mappe custom per vedere se l'algoritmo è supportato e valido
      const jwsAlg = JWS_ALG_MAP[alg.toLowerCase()];
      if (!jwsAlg) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `Unsupported algorithm: ${alg}`
        );
      }

      const expectedKty = ALG_TO_KTY[jwsAlg];
      if (jwk.kty !== expectedKty) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE,
          `Invalid key type: expected ${expectedKty}, got ${jwk.kty}`
        );
      }

      // recupera la configurazione webcrypto corrispondente all'algoritmo della firma. se la mappa non contiene una 
      // configurazione per questo algoritmo, significa che non è supportato e non possiamo verificare la firma     
      const wc = WEBCRYPTO_ALG[jwsAlg];
      if (!wc) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `WebCrypto config missing for ${jwsAlg}`
        );
      }

      // import della publicKey con crypto (jwk)
      let publicKey;
      try {
        publicKey = await subtle.importKey(
          "jwk",
          jwk,
          wc.import,
          false,
          ["verify"]
        );
      } catch (err) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
          `Error importing JWK: ${err.message}`
        );
      }

      // recupero dei componenti e creazione della canonical base
      const coveredComponents = parseCoveredComponents(sigInput);
      const rawParams = sigInput.replace(/^[^;]+;/, "");

      const canonicalBase = getCanonicalSignatureBase(
        headersCopy,
        rawParams,
        coveredComponents
      );

      const payloadBytes = new TextEncoder().encode(canonicalBase);

      let signatureBytes = base64UrlToBuffer(sigB64);

      // ECDSA -> DER -> RAW usando la mappa per capire se quell'algoritmo deve essere convertito in RAW
      if (wc.needsDerConversion) {
        signatureBytes = derToRaw(signatureBytes, wc.rawLen);
      }

      //verifica vera e propria
      const verified = await subtle.verify(
        wc.verify,
        publicKey,
        signatureBytes,
        payloadBytes
      );

      if (!verified) {
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature verification failed for label ${label}`
        );
      }

      console.log(`[verifyHttpSignature] Signature OK for ${label}`);
    }

    console.log("[verifyHttpSignature] All signatures verified successfully");
    return true;

  } catch (err) {
    console.error("[verifyHttpSignature] Verification ERROR:", err.errorCode, " - Message:", err.message);
    if (err instanceof LollipopRequestContentValidationException) throw err;

    throw new LollipopRequestContentValidationException(
      VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
      err.message
    );
  }
}


/**
 * Converte una firma ECDSA dal formato DER al formato RAW (r||s).
 *
 * In webcrypto, l'algoritmo ECDSA richiede che la firma sia nel formato RAW, ovvero la concatenazione
 * delle coordinate r e s con lunghezza fissa. Molte librerie e protocolli invece producono firme
 * in formato DER (Distinguished Encoding Rules), che include informazioni di tipo e lunghezza
 * per r e s. Prima di poter verificare la firma con webcrypto, bisogna quindi estrarre r e s
 * dalla DER e concatenarle correttamente
 *
 * @param {Uint8Array | Buffer} derSig - Firma in formato DER
 * @param {number} coordLen - Lunghezza della coordinata (es. 32 per P-256, 48 per P-384, 66 per P-521)
 * @returns {Uint8Array} Firma in formato RAW pronta per la verifica con WebCrypto
 */
function derToRaw(derSig, coordLen) {
  console.log("[derToRaw] Converting DER signature to raw format");

  if (!(derSig instanceof Uint8Array)) {
    derSig = new Uint8Array(derSig);
  }

  let offset = 2;
  // gestisce la lunghezza "long form" DER
  if (derSig[offset] > 0x80) offset += derSig[offset] - 0x80 + 1;

  //coor r
  const rLen = derSig[offset + 1];
  const r = derSig.subarray(offset + 2, offset + 2 + rLen);

  // coor s
  const sLen = derSig[offset + 2 + rLen + 1];
  const s = derSig.subarray(offset + 2 + rLen + 2, offset + 2 + rLen + 2 + sLen);

  // padding a sinistra se necessario (se r.length < coorLen,vanno aggiunginti zeri all’inizio (padding a sinistra) fino a raggiungere la lunghezza conforme)
  const rPadded = r.length < coordLen ? new Uint8Array([...Array(coordLen - r.length).fill(0), ...r]) : r;
  const sPadded = s.length < coordLen ? new Uint8Array([...Array(coordLen - s.length).fill(0), ...s]) : s;

  return new Uint8Array([...rPadded, ...sPadded]);
}


/**
 * Estrae dati principali da signature-input
 * @param {string} sigInput - Contenuto di signature-input
 * @returns {Object} Oggetto con campi { alg, created, nonce, keyId }
 */
function parseSignatureInput(sigInput) {
  console.log("[parseSignatureInput] Proceeding parsing signature input");
  const algMatch = sigInput.match(/alg="(.*?)"/);
  const createdMatch = sigInput.match(/created=(\d+)/);
  const nonceMatch = sigInput.match(/nonce="(.*?)"/);
  const keyIdMatch = sigInput.match(/keyid="(.*?)"/);

  return {
    alg: algMatch ? algMatch[1] : null,
    created: createdMatch ? parseInt(createdMatch[1], 10) : null,
    nonce: nonceMatch ? nonceMatch[1] : null,
    keyId: keyIdMatch ? keyIdMatch[1] : null
  };
}

/**
 * Estrae i componenti coperti dalla signature-input
 * @param {string} sigInput - Contenuto di signature-input
 * @returns {string[]} Array di nomi dei componenti coperti
 */
function parseCoveredComponents(sigInput) {
  console.log("[parseCoveredComponents] Proceeding parsing covered components from signature-input");
  //const match = sigInput.match(/\(([^)]+)\)/);
  const match = sigInput.match(/\((.*?)\)/);
  const components = match ? match[1].split(/\s+/).map(s => s.replace(/"/g, '').trim()).filter(Boolean) : [];
  console.log("[parseCoveredComponents] Covered components detached");
  return components;
}

/**
 * Genera il canonical signature base da usare per la verifica
 * @param {Object<string, string>} headers - Mappa headers normalizzati
 * @param {string} signatureInputRaw - Parametri raw della signature
 * @param {string[]} coveredComponents - Componenti coperti
 * @returns {string} Canonical base string
 */
function getCanonicalSignatureBase(headers, signatureInputRaw, coveredComponents) {
  const headerMap = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])
  );

  const lines = coveredComponents.map(name => {
    const key = name.toLowerCase();
    if (!(key in headerMap)) {
      throw new Error(`Header ${name} missing`);
    }
    return `"${key}": ${headerMap[key]}`;
  });

  lines.push(`"@signature-params": (${coveredComponents.map(h => `"${h}"`).join(' ')});${signatureInputRaw}`);


  return lines.join('\n');
}


/**
 * Converte Base64URL in Buffer / Uint8Array
 * @param {string} b64url - Stringa Base64URL
 * @returns {Buffer} Decodifica in buffer
 */
function base64UrlToBuffer(b64url) {
  const padded = b64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(b64url.length / 4) * 4, "=");

  return Buffer.from(padded, "base64");
}



module.exports = { verifyHttpSignature };
