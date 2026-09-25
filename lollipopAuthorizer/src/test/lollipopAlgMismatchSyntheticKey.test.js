import crypto from "crypto";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

import { verifyHttpSignature } from "../app/verifyHttpSignature.js";
import LollipopRequestContentValidationException from "../app/exception/lollipopRequestContentValidationException.js";
import { VERIFY_HTTP_ERROR_CODES } from "../app/constants/lollipopErrorsConstants.js";
import {
  PROD_ORIGINAL_METHOD,
  PROD_ORIGINAL_URL,
} from "./constants/lollipopProdEventTest.js";

const SIGNATURE_INPUT =
  'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url")' +
  ';created=1788987092;nonce="7c1ada8e-dd82-45ce-a012-87cf188d2df6"' +
  ';alg="rsa-pss-sha256";keyid="3c42r3lxSt_xTd-dzaQBnWYzAsQkw6dqJly0wpYWSFE"';

function canonicalBase() {
  const rawParams = SIGNATURE_INPUT.replace(/^[^;]+;/, "");
  return [
    `"x-pagopa-lollipop-original-method": ${PROD_ORIGINAL_METHOD}`,
    `"x-pagopa-lollipop-original-url": ${PROD_ORIGINAL_URL}`,
    '"@signature-params": ("x-pagopa-lollipop-original-method" ' +
      `"x-pagopa-lollipop-original-url");${rawParams}`,
  ].join("\n");
}

function mangleModulus(nBase64Url) {
  const modulus = Buffer.from(nBase64Url, "base64url");
  return Buffer.concat([Buffer.from([0x00]), modulus]).toString("base64");
}

function headersWith(publicKey) {
  return {
    "x-pagopa-lollipop-public-key": publicKey,
    "x-pagopa-lollipop-original-method": PROD_ORIGINAL_METHOD,
    "x-pagopa-lollipop-original-url": PROD_ORIGINAL_URL,
  };
}

describe("alg mismatch su chiave che replica le anomalie di produzione", () => {
  let keyPair;
  let pssSignature;

  function publicKeyWithAlg(alg) {
    const { e, n } = keyPair.publicKey.export({ format: "jwk" });
    const jwk = { e, n: mangleModulus(n), kty: "RSA" };
    if (alg) {
      jwk.alg = alg;
    }
    return Buffer.from(JSON.stringify(jwk), "utf8").toString("base64");
  }

  function sign(padding) {
    const options = { key: keyPair.privateKey, padding };
    if (padding === crypto.constants.RSA_PKCS1_PSS_PADDING) {
      options.saltLength = 32; // come WEBCRYPTO_ALG.PS256.verify.saltLength
    }
    const raw = crypto.sign("sha256", Buffer.from(canonicalBase(), "utf8"), options);
    return `sig1=:${raw.toString("base64")}:`;
  }

  before(function () {
    this.timeout(10000);
    keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    pssSignature = sign(crypto.constants.RSA_PKCS1_PSS_PADDING);
  });

  it("JWK con alg RS256 e firma RSA-PSS valida: la firma deve risultare verificata", async () => {
    const verified = await verifyHttpSignature(
      pssSignature,
      SIGNATURE_INPUT,
      headersWith(publicKeyWithAlg("RS256"))
    );

    expect(verified).to.be.true;
  });

  it("stessa chiave e stessa firma con alg allineato (PS256): firma verificata", async () => {
    const verified = await verifyHttpSignature(
      pssSignature,
      SIGNATURE_INPUT,
      headersWith(publicKeyWithAlg("PS256"))
    );

    expect(verified).to.be.true;
  });

  it("stessa chiave e stessa firma senza campo alg nella JWK: firma verificata", async () => {
    const verified = await verifyHttpSignature(
      pssSignature,
      SIGNATURE_INPUT,
      headersWith(publicKeyWithAlg())
    );

    expect(verified).to.be.true;
  });

  it("controllo negativo: firma prodotta con PKCS#1 v1.5 mentre il signature-input dichiara PSS: INVALID_SIGNATURE", async () => {
    const pkcs1Signature = sign(crypto.constants.RSA_PKCS1_PADDING);

    await expect(
      verifyHttpSignature(
        pkcs1Signature,
        SIGNATURE_INPUT,
        headersWith(publicKeyWithAlg("PS256"))
      )
    )
      .to.be.rejectedWith(LollipopRequestContentValidationException)
      .and.to.eventually.have.property(
        "errorCode",
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE
      );
  });

  it("controllo negativo: firma RSA-PSS manomessa di un byte: INVALID_SIGNATURE", async () => {
    const raw = Buffer.from(pssSignature.replace(/^sig1=:|:$/g, ""), "base64");
    raw[0] ^= 0xff;
    const tampered = `sig1=:${raw.toString("base64")}:`;

    await expect(
      verifyHttpSignature(
        tampered,
        SIGNATURE_INPUT,
        headersWith(publicKeyWithAlg("PS256"))
      )
    )
      .to.be.rejectedWith(LollipopRequestContentValidationException)
      .and.to.eventually.have.property(
        "errorCode",
        VERIFY_HTTP_ERROR_CODES.INVALID_SIGNATURE
      );
  });
});
