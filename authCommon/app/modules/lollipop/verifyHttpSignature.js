const { webcrypto } = require("node:crypto");
const { subtle } = webcrypto;
const LollipopValidationError = require("./LollipopValidationError");
const {
  JWS_ALG_MAP,
  ALG_TO_KTY,
  WEBCRYPTO_ALG,
} = require("./lollipopConstants");
const {
  VERIFY_HTTP_ERROR_CODES,
  VALIDATION_ERROR_CODES,
} = require("./lollipopErrorsConstants");
const { lollipopConfig } = require("./lollipopConfig");

/**
 * Verifies HTTP signatures based on Signature and Signature-Input headers.
 *
 * @param {string} signature - Signature header containing the signatures
 * @param {string} signatureInput - Signature-Input header describing signed components
 * @param {Object<string, string>} headers - HTTP header map
 * @param {string} publicKeyBase64 - Lollipop public key provided by the caller
 * @param {string} expectedNonce - Expected nonce value in Signature-Input
 * @param {string} expectedKeyId - Expected keyid value in Signature-Input
 * @param {string[]} requiredSignedHeaders - Headers that must be covered by a valid signature
 * @returns {Promise<boolean>} true when all signatures are successfully verified
 * @throws {LollipopValidationError} when verification fails or the JWK/algorithm is invalid
 */
async function verifyHttpSignature(
  signature,
  signatureInput,
  headers,
  publicKeyBase64,
  expectedNonce,
  expectedKeyId,
  requiredSignedHeaders = [],
) {
  console.log("[verifyHttpSignature] START validation for signature");

  try {
    // Copy headers before removing signature metadata
    const headersCopy = { ...headers };
    delete headersCopy[lollipopConfig.signatureInputHeader];
    delete headersCopy[lollipopConfig.signatureHeader];

    // Parse the JWK
    if (!publicKeyBase64) {
      throw new LollipopValidationError(
        VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY,
        "Lollipop public key not found",
      );
    }

    let jwk;
    try {
      jwk = JSON.parse(
        Buffer.from(publicKeyBase64, "base64url").toString("utf8"),
      );
    } catch (err) {
      throw new LollipopValidationError(
        VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
        `Invalid JWK: ${err.message}`,
        err,
      );
    }

    if (typeof signature !== "string" || signature.trim() === "") {
      throw new LollipopValidationError(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
        "Signature header is missing",
      );
    }

    if (typeof signatureInput !== "string" || signatureInput.trim() === "") {
      throw new LollipopValidationError(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
        "Signature-Input header is missing",
      );
    }

    // Split and trim Signature and Signature-Input entries
    const signatures = signature.split(",").map((s) => s.trim());
    const signatureInputs = signatureInput.split(",").map((s) => s.trim());

    // Ensure Signature and Signature-Input contain the same number of entries
    if (signatures.length !== signatureInputs.length) {
      throw new LollipopValidationError(
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER,
        "Length of signatures and signature-inputs mismatch",
      );
    }

    // Map each signature label to its signature value
    const signatureMap = new Map();
    for (const s of signatures) {
      const idx = s.indexOf("=");
      const label = s.substring(0, idx);
      const value = s.substring(idx + 1).replace(/^:|:$/g, "");
      signatureMap.set(label, value);
    }

    const signedHeaders = new Set();

    // Verify each signature
    for (let i = 0; i < signatureInputs.length; i += 1) {
      const sigInput = signatureInputs[i];
      const label = signatures[i].split("=")[0];
      const sigB64 = signatureMap.get(label);

      if (!sigB64) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature not found for label ${label}`,
        );
      }

      // Parse Signature-Input parameters
      const { alg, nonce, keyId } = parseSignatureInput(sigInput);
      if (!alg) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          "Missing algorithm",
        );
      }

      if (nonce !== expectedNonce) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NONCE,
          "Signature-Input nonce does not match the expected state",
        );
      }

      if (keyId !== expectedKeyId) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_KEY_ID,
          "Signature-Input keyid does not match the expected public key thumbprint",
        );
      }

      // Resolve and validate the supported signature algorithm
      const jwsAlg = JWS_ALG_MAP[alg.toLowerCase()];
      if (!jwsAlg) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `Unsupported algorithm: ${alg}`,
        );
      }

      const expectedKty = ALG_TO_KTY[jwsAlg];
      if (jwk.kty !== expectedKty) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE,
          `Invalid key type: expected ${expectedKty}, got ${jwk.kty}`,
        );
      }

      // Retrieve the WebCrypto configuration for the signature algorithm. A missing
      // configuration means the algorithm is unsupported and cannot be verified.
      const wc = WEBCRYPTO_ALG[jwsAlg];
      if (!wc) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG,
          `WebCrypto config missing for ${jwsAlg}`,
        );
      }

      // Import the public key as a JWK with WebCrypto
      let publicKey;
      try {
        publicKey = await subtle.importKey("jwk", jwk, wc.import, false, [
          "verify",
        ]);
      } catch (err) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.INVALID_JWK,
          `Error importing JWK: ${err.message}`,
          err,
        );
      }

      // Extract covered components and build the canonical signature base
      const coveredComponents = parseCoveredComponents(sigInput);
      const rawParams = sigInput.replace(/^[^;]+;/, "");

      const canonicalBase = getCanonicalSignatureBase(
        headersCopy,
        rawParams,
        coveredComponents,
      );

      coveredComponents.forEach((component) =>
        signedHeaders.add(component.toLowerCase()),
      );

      const payloadBytes = new TextEncoder().encode(canonicalBase);

      let signatureBytes = base64UrlToBuffer(sigB64);

      // Convert ECDSA signatures from DER to RAW when required by the algorithm
      if (wc.needsDerConversion) {
        signatureBytes = derToRaw(signatureBytes, wc.rawLen);
      }

      // Verify the signature
      const verified = await subtle.verify(
        wc.verify,
        publicKey,
        signatureBytes,
        payloadBytes,
      );

      if (!verified) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
          `Signature verification failed for label ${label}`,
        );
      }

      console.log(`[verifyHttpSignature] Signature OK for ${label}`);
    }

    for (const requiredSignedHeader of requiredSignedHeaders) {
      if (!signedHeaders.has(requiredSignedHeader.toLowerCase())) {
        throw new LollipopValidationError(
          VERIFY_HTTP_ERROR_CODES.REQUIRED_SIGNED_HEADER_MISSING,
          `Required header is not covered by any signature: ${requiredSignedHeader}`,
        );
      }
    }

    console.log("[verifyHttpSignature] All signatures verified successfully");
    return true;
  } catch (err) {
    console.error(
      "[verifyHttpSignature] Verification ERROR:",
      err.errorCode,
      " - Message:",
      err.message,
    );
    if (err instanceof LollipopValidationError) throw err;

    throw new LollipopValidationError(
      VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE,
      err.message,
      err,
    );
  }
}

/**
 * Converts an ECDSA signature from DER to RAW format (r || s).
 *
 * WebCrypto expects ECDSA signatures in RAW format: the fixed-length
 * concatenation of r and s. Other libraries and protocols may provide DER
 * signatures instead, which include type and length metadata. The coordinates
 * must therefore be extracted and concatenated before WebCrypto verification.
 *
 * @param {Uint8Array | Buffer} derSig - DER-encoded signature
 * @param {number} coordLen - Coordinate length, for example 32 for P-256, 48 for P-384, or 66 for P-521
 * @returns {Uint8Array} RAW signature ready for WebCrypto verification
 */
function derToRaw(derSig, coordLen) {
  console.log("[derToRaw] Converting DER signature to raw format");

  if (!(derSig instanceof Uint8Array)) {
    derSig = new Uint8Array(derSig);
  }

  let offset = 2;
  // Handle DER long-form lengths
  if (derSig[offset] > 0x80) offset += derSig[offset] - 0x80 + 1;

  // Extract coordinate r
  const rLen = derSig[offset + 1];
  const r = derSig.subarray(offset + 2, offset + 2 + rLen);

  // Extract coordinate s
  const sLen = derSig[offset + 2 + rLen + 1];
  const s = derSig.subarray(
    offset + 2 + rLen + 2,
    offset + 2 + rLen + 2 + sLen,
  );

  // Left-pad short coordinates and remove a DER padding byte from long ones
  const rPadded =
    r.length > coordLen
      ? r.subarray(r.length - coordLen)
      : r.length < coordLen
        ? new Uint8Array([...Array(coordLen - r.length).fill(0), ...r])
        : r;
  const sPadded =
    s.length > coordLen
      ? s.subarray(s.length - coordLen)
      : s.length < coordLen
        ? new Uint8Array([...Array(coordLen - s.length).fill(0), ...s])
        : s;

  return new Uint8Array([...rPadded, ...sPadded]);
}

/**
 * Extracts the main fields from Signature-Input.
 *
 * @param {string} sigInput - Signature-Input value
 * @returns {Object} Object containing alg, created, nonce, and keyId
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
    keyId: keyIdMatch ? keyIdMatch[1] : null,
  };
}

/**
 * Extracts components covered by Signature-Input.
 *
 * @param {string} sigInput - Signature-Input value
 * @returns {string[]} Names of the covered components
 */
function parseCoveredComponents(sigInput) {
  if (!sigInput || typeof sigInput !== "string") return [];

  console.log("[parseCoveredComponents] Proceeding parsing without regex");

  // Find the parentheses enclosing covered components
  const start = sigInput.indexOf("(");
  const end = sigInput.indexOf(")", start);

  if (start === -1 || end === -1) {
    return [];
  }

  const content = sigInput.substring(start + 1, end);

  return content
    .split(/\s+/)
    .map((s) => s.replace(/"/g, "").trim())
    .filter(Boolean);
}

/**
 * Builds the canonical signature base used for verification.
 *
 * @param {Object<string, string>} headers - Normalized HTTP headers
 * @param {string} signatureInputRaw - Raw Signature-Input parameters
 * @param {string[]} coveredComponents - Covered components
 * @returns {string} Canonical signature base
 */
function getCanonicalSignatureBase(
  headers,
  signatureInputRaw,
  coveredComponents,
) {
  const headerMap = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );

  const lines = coveredComponents.map((name) => {
    const key = name.toLowerCase();

    if (!(key in headerMap)) {
      throw new Error(`Header ${name} missing`);
    }

    return `"${key}": ${headerMap[key]}`;
  });

  lines.push(
    `"@signature-params": (${coveredComponents.map((h) => `"${h}"`).join(" ")});${signatureInputRaw}`,
  );

  return lines.join("\n");
}

/**
 * Converts a Base64URL value to a Buffer.
 *
 * @param {string} b64url - Base64URL value
 * @returns {Buffer} Decoded buffer
 */
function base64UrlToBuffer(b64url) {
  const padded = b64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(b64url.length / 4) * 4, "=");

  return Buffer.from(padded, "base64");
}

module.exports = {
  verifyHttpSignature,
};
