const { verifyHttpSignature, LollipopRequestContentValidationException } = require("../app/verifyHttpSignature");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;
const base64url = require("base64url");

const {EC_JWK, RSA_JWK, PUBLIC_KEY_HEADER, VALIDATION_PARAMS } = require("./constants/lollipopConstantsTest");
const { VERIFY_HTTP_ERROR_CODES, VALIDATION_ERROR_CODES } = require("../app/constants/lollipopErrorsConstants");


const KEY_TYPES = [
  { name: "EC", jwk: EC_JWK, sigInput: VALIDATION_PARAMS.VALID_SIGNATURE_INPUT },
  { name: "RSA", jwk: RSA_JWK, sigInput: VALIDATION_PARAMS.VALID_SIGNATURE_INPUT_RSA }
];

describe("verifyHttpSignature - test comuni parametrizzati (EC/RSA parametri non reali)", () => {
  KEY_TYPES.forEach(({ name, jwk, sigInput }) => {
    describe(`con JWK ${name} in header (base64url)`, () => {
      let headers;

      beforeEach(() => {
        headers = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(jwk)) };
      });

      it("manca la public key header: eccezione MISSING_PUBLIC_KEY", async () => {
        const bad = {};
        await expect(verifyHttpSignature(VALIDATION_PARAMS.VALID_SIGNATURE, sigInput, bad))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY);
      });

      it("publickey header non JSON valido: INVALID_JWK", async () => {
        const badJwk = base64url.encode("not a json");
        const badHeaders = { [PUBLIC_KEY_HEADER]: badJwk };
        await expect(verifyHttpSignature(VALIDATION_PARAMS.VALID_SIGNATURE, sigInput, badHeaders))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_JWK);
      });

      it("importJWK fallisce: INVALID_JWK", async () => {
        const badJwk = { kty: name }; // mancano proprietà necessarie
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(badJwk)) };
        await expect(verifyHttpSignature(VALIDATION_PARAMS.VALID_SIGNATURE, sigInput, badHeaders))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_JWK);
      });

      it("flattenedVerify genera eccezione generica: INVALID_SIGNATURE", async () => {
        const fakeSig = "sig1=fake";
        await expect(verifyHttpSignature(fakeSig, sigInput, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
      });

      it("signature-input senza alg: algoritmo non supportato", async () => {
        const badInput = 'sig1=("x-pagopa");created=123;keyid="id"';
        await expect(verifyHttpSignature(VALIDATION_PARAMS.VALID_SIGNATURE, badInput, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG);
      });

      it("multi-firma: fallisce sulla prima con INVALID_SIGNATURE", async () => {
        const sigs = `${VALIDATION_PARAMS.VALID_SIGNATURE},${VALIDATION_PARAMS.VALID_SIGNATURE}`;
        const inps = `${sigInput},${sigInput}`;
        await expect(verifyHttpSignature(sigs, inps, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
      });

      it("numero di signature e signature-input differente: INVALID_SIGNATURE_NUMBER", async () => {
        const sigs = `${VALIDATION_PARAMS.VALID_SIGNATURE},${VALIDATION_PARAMS.VALID_SIGNATURE}`;
        await expect(verifyHttpSignature(sigs, sigInput, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER);
      });

      it("signatureParams.alg non definito + key type sconosciuto: errore UNSUPPORTED KEY TYPE", async () => {
        const unknownJwk = { kty: "UNKN", foo: "bar" };
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(unknownJwk)) };
        await expect(verifyHttpSignature(VALIDATION_PARAMS.VALID_SIGNATURE, sigInput, badHeaders))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE);
      });
    });
  });
});

/* rimossi parametri e commentato perchè questo era un test che validava dati reali

describe("verifyHttpSignature - happy path reale", () => {
  it("verifica correttamente la firma reale della GET", async () => {
    const realPublicKeyJwk = "";
    const realSignature = "";
    const realSignatureInput = "";

    const parameters = {
      [PUBLIC_KEY_HEADER]: realPublicKeyJwk,
      "x-pagopa-lollipop-original-method": "GET",
      "x-pagopa-lollipop-original-url": "",
      "signature-input": realSignatureInput,
      "signature": realSignature
    };

    const result = await verifyHttpSignature(realSignature, realSignatureInput, parameters);
    expect(result).to.be.true;
  });
});
*/
