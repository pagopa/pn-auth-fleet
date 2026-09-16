import crypto from "crypto";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

import { verifyHttpSignature } from "../app/verifyHttpSignature.js";
import LollipopRequestContentValidationException from "../app/exception/lollipopRequestContentValidationException.js";
import { VERIFY_HTTP_ERROR_CODES } from "../app/constants/lollipopErrorsConstants.js";

const METHOD = "GET";
const URL = "https://api-app.io.pagopa.it/x";

const SPECS = {
  ES256: { id: "ecdsa-p256-sha256", curve: "prime256v1", hash: "sha256", mismatchedAlg: "ES384" },
  ES384: { id: "ecdsa-p384-sha384", curve: "secp384r1", hash: "sha384", mismatchedAlg: "ES256" },
  PS256: { id: "rsa-pss-sha256", salt: 32, hash: "sha256", mismatchedAlg: "RS256" },
  PS384: { id: "rsa-pss-sha384", salt: 48, hash: "sha384", mismatchedAlg: "RS384" },
  PS512: { id: "rsa-pss-sha512", salt: 64, hash: "sha512", mismatchedAlg: "RS512" },
  RS256: { id: "rsa-v1_5-sha256", hash: "sha256", mismatchedAlg: "PS256" },
  RS384: { id: "rsa-v1_5-sha384", hash: "sha384", mismatchedAlg: "PS384" },
  RS512: { id: "rsa-v1_5-sha512", hash: "sha512", mismatchedAlg: "PS512" },
};

function signatureInput(algId) {
  return (
    'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url")' +
    `;created=1;nonce="n";alg="${algId}";keyid="k"`
  );
}

function canonicalBase(algId) {
  const rawParams = signatureInput(algId).replace(/^[^;]+;/, "");
  return [
    `"x-pagopa-lollipop-original-method": ${METHOD}`,
    `"x-pagopa-lollipop-original-url": ${URL}`,
    '"@signature-params": ("x-pagopa-lollipop-original-method" ' +
      `"x-pagopa-lollipop-original-url");${rawParams}`,
  ].join("\n");
}

describe("verifyHttpSignature - matrice degli algoritmi supportati", () => {
  const keys = {};

  function keyPairFor(spec) {
    if (!spec.curve) {
      return keys.rsa;
    }
    return keys[spec.curve];
  }

  function sign(spec) {
    const options = { key: keyPairFor(spec).privateKey };
    if (spec.salt) {
      options.padding = crypto.constants.RSA_PKCS1_PSS_PADDING;
      options.saltLength = spec.salt;
    }
    const raw = crypto.sign(spec.hash, Buffer.from(canonicalBase(spec.id), "utf8"), options);
    return { raw, header: `sig1=:${raw.toString("base64")}:` };
  }

  function publicKeyHeader(spec, alg) {
    const jwk = keyPairFor(spec).publicKey.export({ format: "jwk" });
    delete jwk.alg;
    if (alg) {
      jwk.alg = alg;
    }
    return Buffer.from(JSON.stringify(jwk), "utf8").toString("base64");
  }

  function headers(publicKey) {
    return {
      "x-pagopa-lollipop-public-key": publicKey,
      "x-pagopa-lollipop-original-method": METHOD,
      "x-pagopa-lollipop-original-url": URL,
    };
  }

  before(function () {
    this.timeout(30000);
    keys.rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    for (const curve of ["prime256v1", "secp384r1"]) {
      keys[curve] = crypto.generateKeyPairSync("ec", { namedCurve: curve });
    }
  });

  Object.entries(SPECS).forEach(([alg, spec]) => {
    it(`${alg}: JWK con alg coerente, firma verificata`, async () => {
      const { header } = sign(spec);

      const verified = await verifyHttpSignature(
        header,
        signatureInput(spec.id),
        headers(publicKeyHeader(spec, alg))
      );

      expect(verified).to.be.true;
    });

    it(`${alg}: firma manomessa, INVALID_SIGNATURE`, async () => {
      const { raw } = sign(spec);
      const tampered = Buffer.from(raw);
      tampered[tampered.length - 1] ^= 0xff;

      await expect(
        verifyHttpSignature(
          `sig1=:${tampered.toString("base64")}:`,
          signatureInput(spec.id),
          headers(publicKeyHeader(spec, alg))
        )
      )
        .to.be.rejectedWith(LollipopRequestContentValidationException)
        .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
    });

    const isRs256LabelOnPs256Signature = alg === "PS256" && spec.mismatchedAlg === "RS256";

    it(`${alg}: JWK etichettata ${spec.mismatchedAlg}, incoerente con il signature-input${isRs256LabelOnPs256Signature ? " (caso di produzione): firma verificata" : ": INVALID_JWK"}`, async () => {
      const { header } = sign(spec);
      const outcome = verifyHttpSignature(
        header,
        signatureInput(spec.id),
        headers(publicKeyHeader(spec, spec.mismatchedAlg))
      );

      if (isRs256LabelOnPs256Signature) {
        expect(await outcome).to.be.true;
        return;
      }

      await expect(outcome)
        .to.be.rejectedWith(LollipopRequestContentValidationException)
        .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_JWK);
    });
  });

  it("kty non coerente con l'algoritmo del signature-input: UNSUPPORTED_KEY_TYPE", async () => {
    const { header } = sign(SPECS.PS256);

    await expect(
      verifyHttpSignature(
        header,
        signatureInput(SPECS.PS256.id),
        headers(publicKeyHeader(SPECS.ES256, "ES256"))
      )
    )
      .to.be.rejectedWith(LollipopRequestContentValidationException)
      .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE);
  });

  ["hmac-sha256", "ed25519"].forEach((algId) => {
    it(`signature-input con alg="${algId}": UNSUPPORTED_KEY_TYPE`, async () => {
      const { header } = sign(SPECS.PS256);

      await expect(
        verifyHttpSignature(header, signatureInput(algId), headers(publicKeyHeader(SPECS.PS256, "PS256")))
      )
        .to.be.rejectedWith(LollipopRequestContentValidationException)
        .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE);
    });
  });

  it("signature-input con alg non mappato: UNSUPPORTED_ALG", async () => {
    const { header } = sign(SPECS.PS256);

    await expect(
      verifyHttpSignature(
        header,
        signatureInput("rsa-fantasia-sha1"),
        headers(publicKeyHeader(SPECS.PS256, "PS256"))
      )
    )
      .to.be.rejectedWith(LollipopRequestContentValidationException)
      .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG);
  });
});
