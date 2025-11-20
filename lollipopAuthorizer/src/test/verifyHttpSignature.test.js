const { verifyHttpSignature, LollipopRequestContentValidationException } = require("../app/verifyHttpSignature");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;
const base64url = require("base64url");
const {VALID_SIGNATURE_INPUT, VALID_SIGNATURE, PUBLIC_KEY_HEADER, EC_JWK, RSA_JWK} = require("./constants/lollipopConstantsTest");

const VALID_EC_PUBLIC_KEY_JWK = base64url.encode(JSON.stringify(EC_JWK));
const VALID_RSA_PUBLIC_KEY_JWK = base64url.encode(JSON.stringify(RSA_JWK));
// parametri per test comuni EC/RSA
const KEY_TYPES = [
  {
    name: "EC",
    jwk: VALID_EC_PUBLIC_KEY_JWK,
    sigInput: VALID_SIGNATURE_INPUT
  },
  {
    name: "RSA",
    jwk: VALID_RSA_PUBLIC_KEY_JWK,
    sigInput: 'sig1=("content-digest");created=123;alg="rsa-v1_5-sha256";keyid="id"'
  }
];

describe("verifyHttpSignature - test comuni parametrizzati", () => {
  KEY_TYPES.forEach(({ name, jwk, sigInput }) => {
    describe(`con JWK ${name} in header (base64url)`, () => {
      let headers;

      beforeEach(() => {
        headers = { [PUBLIC_KEY_HEADER]: jwk };
      });

      it("manca la public key header: eccezione MISSING_PUBLIC_KEY_ERROR", async () => {
        const bad = {};
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, bad))
          .to.eventually.be.rejectedWith(LollipopRequestContentValidationException);
      });

      it("publickey header non JSON valido: INVALID_JWK", async () => {
        const badJwk = base64url.encode("not a json");
        const badHeaders = { [PUBLIC_KEY_HEADER]: badJwk };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
          .to.eventually.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", "INVALID_JWK");
      });

      it("importJWK fallisce: INVALID_JWK", async () => {
        const badJwk = { kty: name }; // mancano proprietà necessarie
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(badJwk)) };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
          .to.eventually.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", "INVALID_JWK");
      });

      it("flattenedVerify genera eccezione generica: INVALID_SIGNATURE", async () => {
        const fakeSig = "sig1=ZmFrZXNpZ25hdHVyZQ==";
        await expect(verifyHttpSignature(fakeSig, sigInput, headers))
          .to.eventually.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", "INVALID_SIGNATURE");
      });

      it("signature-input senza alg: INVALID_SIGNATURE_ALG", async () => {
        const badInput = 'sig1=("x-pagopa");created=123;keyid="id"';
        await expect(verifyHttpSignature(VALID_SIGNATURE, badInput, headers))
          .to.eventually.be.rejectedWith(/INVALID_SIGNATURE_ALG/i);
      });

      it("multi-firma: fallisce sulla prima con INVALID_SIGNATURE", async () => {
        const sigs = `${VALID_SIGNATURE},${VALID_SIGNATURE}`;
        const inps = `${sigInput},${sigInput}`;
        await expect(verifyHttpSignature(sigs, inps, headers))
          .to.eventually.be.rejectedWith(/INVALID_SIGNATURE/i);
      });

      it("numero di signature e signature-input differente: INVALID_SIGNATURE_NUMBER", async () => {
        const sigs = `${VALID_SIGNATURE},${VALID_SIGNATURE}`;
        await expect(verifyHttpSignature(sigs, sigInput, headers))
          .to.eventually.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", "INVALID_SIGNATURE_NUMBER");
      });

      it("signatureParams.alg non definito + key type sconosciuto: errore UNSUPPORTED KEY TYPE", async () => {
        const unknownJwk = { kty: "UNKN", foo: "bar" };
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(unknownJwk)) };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
          .to.eventually.be.rejectedWith(/Unsupported key type/i);
      });

      it("signatureParams opzionali mancanti: errore algoritmo non supportato", async () => {
        const inputNoOptional = 'sig1=("@signature-params");alg="ES256"';
        await expect(verifyHttpSignature(VALID_SIGNATURE, inputNoOptional, headers))
          .to.eventually.be.rejectedWith(/Unsupported algorithm/i);
      });

      it("flattenedVerify genera eccezione: INVALID_SIGNATURE con label", async () => {
        const fakeSig = "sig1=ZmFrZXNpZ25hdHVyZQ==";
        await expect(verifyHttpSignature(fakeSig, sigInput, headers))
          .to.eventually.be.rejectedWith(/INVALID_SIGNATURE for label sig1/i);
      });
    });
  });
});