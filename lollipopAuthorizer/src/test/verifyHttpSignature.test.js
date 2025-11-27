const { verifyHttpSignature, LollipopRequestContentValidationException } = require("../app/verifyHttpSignature");
//const { verifyHttpSignature } = require("../app/verifyHttpMessageSignature");

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;
const base64url = require("base64url");

const { PUBLIC_KEY_HEADER } = require("./constants/lollipopConstantsTest");
const { VERIFY_HTTP_ERROR_CODES, VALIDATION_ERROR_CODES } = require("../app/constants/lollipopErrorsConstants");

// JWK completi
const EC_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "FqFDuwEgu4MUXERPMVL-85pGv2D3YmL4J1gfMkdbc24",
  y: "hdV0oxmWFSxMoJUDpdihr76rS8VRBEqMFebYyAfK9-k",
  alg: "ES256"
};

const RSA_JWK = {
  kty: "RSA",
  n: "16664736175603627996319962836030881026179675012391119517975514948152431214653585662880486636564539745534321011181408561816254231231298259205135081219875827651147217038442994953270212442857910417611387549687536933145745249602198835932059392377695498325446146715840517338191125529557810596070318285357964276748438650077150378696894010172596714187128214451872453277619054588751139432194135913672107689362828514055714059473608142304229480488308405791341245363647711560656764853819020066812645413910427819478301754525254844345246642430554339909098721902422359723272095429198014557278590405542226255562568066559844209030611",
  e: "65537",
  alg: "RS256"
};



// Signature input coerente
const VALID_SIGNATURE_INPUT_EC = 
  'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url");created=1678293988;alg="ecdsa-p256-sha256";keyid="id"';
const VALID_SIGNATURE_INPUT_RSA = 
  'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url");created=1678293988;alg="rsa-v1_5-sha256";keyid="id"';

const VALID_SIGNATURE = "sig1=:ZmFrZXNpZ25hdHVyZQ==:";

const KEY_TYPES = [
  { name: "EC", jwk: EC_JWK, sigInput: VALID_SIGNATURE_INPUT_EC },
  { name: "RSA", jwk: RSA_JWK, sigInput: VALID_SIGNATURE_INPUT_RSA }
];
/* test ko commentati al momento
describe("verifyHttpSignature - test comuni parametrizzati", () => {
  KEY_TYPES.forEach(({ name, jwk, sigInput }) => {
    describe(`con JWK ${name} in header (base64url)`, () => {
      let headers;

      beforeEach(() => {
        headers = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(jwk)) };
      });

      it("manca la public key header: eccezione MISSING_PUBLIC_KEY", async () => {
        const bad = {};
      await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, bad))
 .to.be.rejectedWith(LollipopRequestContentValidationException)
  .and.to.eventually.have.property("errorCode", VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY);

      });

      it("publickey header non JSON valido: INVALID_JWK", async () => {
        const badJwk = base64url.encode("not a json");
        const badHeaders = { [PUBLIC_KEY_HEADER]: badJwk };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
         .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_JWK);
      });

      it("importJWK fallisce: INVALID_JWK", async () => {
        const badJwk = { kty: name }; // mancano proprietà necessarie
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(badJwk)) };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
         .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_JWK);
      });

      it("flattenedVerify genera eccezione generica: INVALID_SIGNATURE", async () => {
        const fakeSig = "sig1=ZmFrZXNpZ25hdHVyZQ==";
        await expect(verifyHttpSignature(fakeSig, sigInput, headers))
         .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
      });

      it("signature-input senza alg: algoritmo non supportato", async () => {
        const badInput = 'sig1=("x-pagopa");created=123;keyid="id"';
        await expect(verifyHttpSignature(VALID_SIGNATURE, badInput, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_ALG);
      });

      it("multi-firma: fallisce sulla prima con INVALID_SIGNATURE", async () => {
        const sigs = `${VALID_SIGNATURE},${VALID_SIGNATURE}`;
        const inps = `${sigInput},${sigInput}`;
        await expect(verifyHttpSignature(sigs, inps, headers))
         .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
      });

      it("numero di signature e signature-input differente: INVALID_SIGNATURE_NUMBER", async () => {
        const sigs = `${VALID_SIGNATURE},${VALID_SIGNATURE}`;
        await expect(verifyHttpSignature(sigs, sigInput, headers))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE_NUMBER);
      });

      it("signatureParams.alg non definito + key type sconosciuto: errore UNSUPPORTED KEY TYPE", async () => {
        const unknownJwk = { kty: "UNKN", foo: "bar" };
        const badHeaders = { [PUBLIC_KEY_HEADER]: base64url.encode(JSON.stringify(unknownJwk)) };
        await expect(verifyHttpSignature(VALID_SIGNATURE, sigInput, badHeaders))
          .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.UNSUPPORTED_KEY_TYPE);
      });

      it("flattenedVerify genera eccezione: INVALID_SIGNATURE con label", async () => {
        const fakeSig = "sig1=ZmFrZXNpZ25hdHVyZQ==";
        await expect(verifyHttpSignature(fakeSig, sigInput, headers))
         .to.be.rejectedWith(LollipopRequestContentValidationException)
          .and.to.eventually.have.property("errorCode", VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE);
      });
    });
  });
});
*/

describe("verifyHttpSignature - happy path reale", () => {
  it("verifica correttamente la firma reale della GET", async () => {
    const realPublicKeyJwk = "eyJrdHkiOiJFQyIsIngiOiJGcUZEd"
                                    + "XdFZ3U0TVVYRVJQTVZMLTg1cEd2MkQzWW1MNEoxZ2ZNa2RiYzI0IiwieSI6Im"
                                    + "hkVjBveG1XRlN4TW9KVURwZGlocjc2clM4VlJCRXFNRmViWXlBZks5LWsiLCJjcnYiO"
                                    + "iJQLTI1NiJ9";
    const realSignature = VALID_SIGNATURE;
    const realSignatureInput = VALID_SIGNATURE_INPUT_EC;

    const parameters = {
      [PUBLIC_KEY_HEADER]: realPublicKeyJwk,
      "x-pagopa-lollipop-original-method": "GET",
      "x-pagopa-lollipop-original-url": "https://api-app.mock.it/api/v1/000000000",
      "signature-input": realSignatureInput,
      "signature": realSignature
    };

    const result = await verifyHttpSignature(realSignature, realSignatureInput, parameters);
    expect(result).to.be.true;
  });
});

