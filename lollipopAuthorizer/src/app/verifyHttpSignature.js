const { flattenedVerify, importJWK, createVerify } = require('jose');
const base64url = require('base64url');

const { derToJose } = require('ecdsa-sig-formatter');

const LollipopRequestContentValidationException = require('../app/exception/lollipopRequestContentValidationException');
const { lollipopConfig, JWS_ALG_MAP, ALG_TO_KTY } = require('./constants/lollipopConstants');
const { VERIFY_HTTP_ERROR_CODES, VALIDATION_ERROR_CODES } = require('./constants/lollipopErrorsConstants');

/**
 * Verifica la signature HTTP basata su signature-input e headers
 * @param {string} signature - Header Signature
 * @param {string} signatureInput - Header Signature-Input
 * @param {Object} headers - Mappa di headers
 * @returns {Promise<boolean>}
 */
async function verifyHttpSignature(signature, signatureInput, headers) {
  console.log("[verifyHttpSignature] START verification");
  console.log("[verifyHttpSignature] Incoming signature:", signature);
  console.log("[verifyHttpSignature] Incoming signatureInput:", signatureInput);
  console.log("[verifyHttpSignature] Incoming headers:", headers);

  try {
    const headersCopy = { ...headers };
    delete headersCopy[lollipopConfig.signatureInputHeader];
    delete headersCopy[lollipopConfig.signatureHeader];
    console.log("[verifyHttpSignature] Headers copy after deleting signature headers:", headersCopy);

    // estrazione della chiave pubblica in jwk fornita tramite header
    const lollipopKey = headers[lollipopConfig.publicKeyHeader];
    console.log("[verifyHttpSignature] Lollipop publicKey header:", lollipopKey);
    if (!lollipopKey) {
      console.error("[verifyHttpSignature] Public key header missing");
      throw new LollipopRequestContentValidationException(
        VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR,
        "Lollipop publicKey header not found"
      );
    }

    // parse JWK
    let jwk;
    try {
      jwk = JSON.parse(Buffer.from(lollipopKey, 'base64').toString('utf8'));
      console.log("[verifyHttpSignature] Parsed JWK:", jwk);
    } catch (err) {
      console.error("[verifyHttpSignature] Error parsing JWK:", err);
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
        `Invalid JWK: ${err.message}`
      );
    }

    const signatures = signature.split(',').map(s => s.trim());
    const signatureInputs = signatureInput.split(',').map(s => s.trim());
    console.log("[verifyHttpSignature] Parsed signatures array:", signatures);
    console.log("[verifyHttpSignature] Parsed signatureInputs array:", signatureInputs);

    if (signatures.length !== signatureInputs.length) {
      console.error("[verifyHttpSignature] Signature and signatureInput count mismatch");
      throw new LollipopRequestContentValidationException(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER,
        'Number of signatures and signature-inputs mismatch'
      );
    }

    const signatureMap = new Map();
    for (const s of signatures) {
      //const [label, value] = 
      const endSplitNumber = s.indexOf("=");
      const label = s.substring(0, endSplitNumber);
      const value = s.substring(endSplitNumber + 1);

      console.log("Value signature:", value);
      console.log("Label signature:", label);

      const valueClean = value ? value.replace(/^:|:$/g, '') : undefined;
      console.log(`[verifyHttpSignature] Mapping signature: ${label} => ${valueClean}`);
      signatureMap.set(label, valueClean);
    }

    // ciclo su ogni coppia signature-input/signature
    for (let i = 0; i < signatureInputs.length; i++) {
      const sigInput = signatureInputs[i];
      const label = signatures[i].split('=')[0];
      const sigB64 = signatureMap.get(label);
      console.log(`[verifyHttpSignature] Processing label: ${label}, signature base64: ${sigB64}`);

      if (!sigB64) {
        console.error(`[verifyHttpSignature] Signature not found for label ${label}`);
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature not found for label ${label}`
        );
      }

      // parse alg, created, nonce, keyId
      const { alg, created, nonce, keyId } = parseSignatureInput(sigInput);
      console.log(`[verifyHttpSignature] Parsed signature input: alg=${alg}, created=${created}, nonce=${nonce}, keyId=${keyId}`);

      if (!alg) {
        console.error("[verifyHttpSignature] Signature algorithm not defined");
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          'Signature algorithm not defined'
        );
      }

      //algoritmo JWS
      const jwsAlg = JWS_ALG_MAP[alg.toLowerCase()];
      console.log(`[verifyHttpSignature] Mapped JWS algorithm: ${jwsAlg}`);
      if (!jwsAlg) {
        console.error("[verifyHttpSignature] Unsupported JWS algorithm");
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `Unsupported algorithm: ${alg}`
        );
      }

      const expectedKty = ALG_TO_KTY[jwsAlg];
      console.log(`[verifyHttpSignature] Expected key type for algorithm ${jwsAlg}: ${expectedKty}`);
      if (!expectedKty) {
        console.error("[verifyHttpSignature] Unsupported key type mapping for algorithm");
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `Unsupported algorithm: ${alg}`
        );
      }

      if (jwk.kty !== expectedKty) {
        console.error(`[verifyHttpSignature] Key type mismatch: JWK=${jwk.kty}, expected=${expectedKty}`);
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE,
          `Key type "${jwk.kty}" does not match algorithm "${alg}"`
        );
      }

      // import chiave pubblica
      let jwkKey;
      try {
        jwkKey = await importJWK(jwk, jwsAlg);
        console.log("[verifyHttpSignature] Imported JWK key:", jwkKey);
      } catch (err) {
        console.error("[verifyHttpSignature] Error importing JWK:", err);
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
          `Error importing JWK: ${err.message}`
        );
      }

      // parse componenti
      const coveredComponents = parseCoveredComponents(sigInput);
      console.log(`[verifyHttpSignature] Covered components: ${coveredComponents}`);

      // canonical signature base
      let canonicalBase;
      let payloadBytes;
      try {
        canonicalBase = getCanonicalSignatureBase(headersCopy, { created, nonce, alg, keyId }, coveredComponents);
        console.log("[verifyHttpSignature] Canonical signature base: ", canonicalBase);
        console.log("Base64Url.encode(Buffer.from(canonicalBase, 'utf8'): ", base64url.encode(Buffer.from(canonicalBase, 'utf8')))
        payloadBytes = new TextEncoder().encode(canonicalBase);

        console.log("[DEBUG] TEXTEncoded payload:", payloadBytes);
        console.log("[DEBUG] canonicalBase bytes:", Array.from(payloadBytes));
        console.log("[DEBUG] payload length:", payloadBytes.length);
      } catch (err) {
        console.error("[verifyHttpSignature] Error building canonical base:", err);
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Error building canonical base: ${err.message}`
        );
      }

      //flattened JWS
      const protectedHeader = base64url.encode(JSON.stringify({ alg: jwsAlg, kid: keyId }));
      const sigRaw = Buffer.from(sigB64, 'base64');
      console.log("sigb64 for buffer sigRaw ->", sigB64);
      console.log("sigRaw buffer ->", sigRaw);


      // Converte DER → JOSE (r||s) base64
      const sigJoseBase64 = derToJose(sigRaw, 'ES256');
      const sigJoseBase64Url = base64url.fromBase64(sigJoseBase64);

      // Conversione base64 -> base64URL
      const signatureJose = base64url.fromBase64(sigJoseBase64); console.log("SIGRAW:", sigRaw);
      console.log(`[verifyHttpSignature] Raw signature buffer length: ${sigRaw.length}`);
      console.log("[DEBUG] SIGNATURE RAW bytes:", Array.from(sigRaw));

      // payload: base64url dei byte UTF-8 del canonicalBase
      const payloadBase64Url = base64url.encode(Buffer.from(canonicalBase, 'utf8'));

      // signature: converti correttamente DER->JOSE se necessario, altrimenti usa raw->base64url
      //let signatureJose;
      /*if (jwsAlg.startsWith('ES')) {
        // prova a convertire DER->JOSE; se fallisce, assume che sia già r||s concatenati
        try {
          // derToJose può restituire stringa Base64 (JOSE) o Buffer a seconda della versione:
          const converted = derToJose(sigRaw, jwsAlg);
          // se converted è Buffer, codificalo in base64url; se è stringa già base64url, usalo così com'è
          if (Buffer.isBuffer(converted)) {
            signatureJose = base64url.encode(converted);
          } else {
            // converted è probabilmente stringa base64url o base64; normalizziamo:
            // se contiene + o / o = la convertiamo in base64url
            signatureJose = converted.includes('+') || converted.includes('/') || converted.includes('=') 
              ? base64url.fromBase64 ? base64url.fromBase64(converted) : base64url.encode(Buffer.from(converted, 'base64'))
              : converted;
          }
        } catch (err) {
          // fallback: potrebbe essere già r||s concatenati (es. WebCrypto)
          console.warn("[verifyHttpSignature] derToJose failed, assuming signature is raw r||s concatenated:", err.message);
          signatureJose = base64url.encode(sigRaw);
        }
      } else {
        signatureJose = base64url.encode(sigRaw);
      }*/

      const flattenedJws = {
        protected: protectedHeader,
        payload: payloadBase64Url,
        signature: sigJoseBase64Url
      };
      console.log("[verifyHttpSignature] Flattened JWS object:", flattenedJws);
      console.log(`[verifyHttpSignature] jwsAlg=${jwsAlg}, expectedKty=${expectedKty}, jwk.kty=${jwk.kty}`);

      // verifica firma
      try {
        await flattenedVerify(flattenedJws, jwkKey);
        console.log(`[verifyHttpSignature] Signature verification SUCCESS for label "${label}"`);
      } catch (err) {
        console.error(`[verifyHttpSignature] Signature verification FAILED for label "${label}"`, err);
        throw new LollipopRequestContentValidationException(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature verification failed for label ${label}: ${err.message}`
        );
      }
    }

    console.log("[verifyHttpSignature] All signatures verified successfully");
    return true;
  } catch (err) {
    console.error("[verifyHttpSignature] Verification ERROR:", err);
    if (err instanceof LollipopRequestContentValidationException) throw err;
    throw new LollipopRequestContentValidationException(
      VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
      err.message
    );
  }
}

/**
 * Converte una signature ECDSA DER in raw (r||s) -> invece di questa stiamo usando quella della libreria ecdsa-sig-formatter
 */
function derToRaw(derSig, coordLen) {
  console.log("[derToRaw] Converting DER signature to raw format");
  let offset = 2;
  if (derSig[offset] > 0x80) offset += derSig[offset] - 0x80 + 1;

  const rLen = derSig[offset + 1];
  const r = derSig.slice(offset + 2, offset + 2 + rLen);
  const sLen = derSig[offset + 2 + rLen + 1];
  const s = derSig.slice(offset + 2 + rLen + 2, offset + 2 + rLen + 2 + sLen);

  const rPadded = r.length < coordLen ? Buffer.concat([Buffer.alloc(coordLen - r.length, 0), r]) : r;
  const sPadded = s.length < coordLen ? Buffer.concat([Buffer.alloc(coordLen - s.length, 0), s]) : s;

  return Buffer.concat([rPadded, sPadded]);
}

/**
 * Parse signature input (alg, created, nonce, keyId)
 */
function parseSignatureInput(sigInput) {
  console.log("[parseSignatureInput] Parsing signature input:", sigInput);
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
 * Estrae i componenti coperti
 */
function parseCoveredComponents(sigInput) {
  console.log("[parseCoveredComponents] Parsing covered components from:", sigInput);
  const match = sigInput.match(/\(([^)]+)\)/);
  const components = match ? match[1].split(/\s+/).map(s => s.replace(/"/g, '').trim()).filter(Boolean) : [];
  console.log("[parseCoveredComponents] Covered components:", components);
  return components;
}

// Crea la Signature Base secondo gli standard RFC
function getCanonicalSignatureBase(headers, params, coveredComponents) {
  const normalized = coveredComponents.map(h => h.trim().toLowerCase());
  const headerMap = Object.keys(headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key];
    return acc;
  }, {});

  const lines = normalized.map(name => {
    if (!(name in headerMap)) {
      throw new Error(`Header ${name} missing`);
    }
    const value = String(headerMap[name]).replace(/\s+/g, ' ').trim();
    return `"${name}": ${value}`;
  });

  const covered = `(${normalized.map(s => `"${s}"`).join(' ')})`;
  const paramStr = `created=${params.created};nonce="${params.nonce}";alg="${params.alg}";keyid="${params.keyId}"`;

  lines.push(`"@signature-params": ${covered};${paramStr}`);
  console.log("keyId: ", params.keyId);

  return lines.join('\n');
}


module.exports = { verifyHttpSignature };
