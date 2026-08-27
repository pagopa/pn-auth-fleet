const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const rewire = require("rewire");

chai.use(chaiAsPromised);

const { expect } = chai;
const LollipopValidationError = require("../../app/modules/lollipop/LollipopValidationError");

function buildInput() {
  return {
    assertion: "<fake-saml-assertion/>",
    assertionRef: "sha256-fake-assertion-reference",
    publicKey: "fake-public-key",
    fiscalCode: "AAAAAA00A00A000A",
    headers: {
      Signature: "callback-signature",
      "Signature-Input": "callback-signature-input",
      "X-Pagopa-Lollipop-Custom-Code": "fake-code",
      "X-Pagopa-Lollipop-Custom-State": "fake-state",
      "X-Pagopa-Lollipop-Custom-Iss": "https://oauth.io.pagopa.it",
    },
    expectedNonce: "fake-state",
    expectedSignedHeaders: {
      "x-pagopa-lollipop-custom-code": "fake-code",
      "x-pagopa-lollipop-custom-state": "fake-state",
      "x-pagopa-lollipop-custom-iss": "https://oauth.io.pagopa.it",
    },
    assertionExpireInDays: 365,
    idpConfig: {
      baseUrl: "https://idp-config.example.test",
      cieEntityIds: [],
      timeoutMs: 1000,
    },
  };
}

function loadValidateLollipop(overrides = {}) {
  const lollipopModule = rewire(
    "../../app/modules/lollipop/validateLollipop.js",
  );

  lollipopModule.__set__(overrides);

  return lollipopModule.__get__("validateLollipop");
}

describe("validateLollipop", () => {
  it("orchestrates the complete Lollipop validation using normalized input", async () => {
    const input = buildInput();
    const assertionDoc = { name: "fake-assertion-document" };
    const idpCertDataList = [{ entityId: "https://idp.example.test" }];
    const calls = {};

    const validateLollipop = loadValidateLollipop({
      buildDocumentFromAssertion: (assertion) => {
        calls.assertion = assertion;
        return assertionDoc;
      },
      getIdpCertData: async (document, idpConfig) => {
        calls.idpCertData = [document, idpConfig];
        return idpCertDataList;
      },
      validateAssertionPeriod: async (document, expireInDays) => {
        calls.assertionPeriod = [document, expireInDays];
        return true;
      },
      validateFiscalCode: (fiscalCode, document) => {
        calls.fiscalCode = [fiscalCode, document];
        return true;
      },
      validateInResponseTo: async (assertionRef, publicKey, document) => {
        calls.inResponseTo = [assertionRef, publicKey, document];
        return true;
      },
      validateSignature: (document, certificates) => {
        calls.assertionSignature = [document, certificates];
        return true;
      },
      verifyHttpSignature: async (...args) => {
        calls.httpSignature = args;
        return true;
      },
    });

    await expect(validateLollipop(input)).to.eventually.equal(undefined);

    expect(calls.assertion).to.equal(input.assertion);
    expect(calls.idpCertData).to.deep.equal([assertionDoc, input.idpConfig]);
    expect(calls.assertionPeriod).to.deep.equal([
      assertionDoc,
      input.assertionExpireInDays,
    ]);
    expect(calls.fiscalCode).to.deep.equal([input.fiscalCode, assertionDoc]);
    expect(calls.inResponseTo).to.deep.equal([
      input.assertionRef,
      input.publicKey,
      assertionDoc,
    ]);
    expect(calls.assertionSignature).to.deep.equal([
      assertionDoc,
      idpCertDataList,
    ]);

    expect(calls.httpSignature[0]).to.equal("callback-signature");
    expect(calls.httpSignature[1]).to.equal("callback-signature-input");
    expect(calls.httpSignature[3]).to.equal(input.publicKey);
    expect(calls.httpSignature[4]).to.equal(input.expectedNonce);

    // keyid must be matched against thumbprint in assertion_ref, without the algorithm prefix.
    expect(calls.httpSignature[5]).to.equal("fake-assertion-reference");

    expect(calls.httpSignature[6]).to.deep.equal([
      "x-pagopa-lollipop-custom-code",
      "x-pagopa-lollipop-custom-state",
      "x-pagopa-lollipop-custom-iss",
    ]);
  });

  it("fails before retrieving IdP certificates when a signed callback header does not match", async () => {
    const input = buildInput();
    input.headers["X-Pagopa-Lollipop-Custom-Code"] = "different-code";

    let idpCertDataRequested = false;

    const validateLollipop = loadValidateLollipop({
      getIdpCertData: async () => {
        idpCertDataRequested = true;
        return [];
      },
    });

    await expect(validateLollipop(input))
      .to.be.rejectedWith(LollipopValidationError)
      .and.eventually.have.property("errorCode", "INVALID_SIGNED_HEADER_VALUE");

    expect(idpCertDataRequested).to.equal(false);
  });
});
