const { generateKeyPairSync } = require("node:crypto");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const { expect } = chai;

const {
  buildDocumentFromAssertion,
  computeThumbprintWithCrypto,
  getAssertionReferenceKeyId,
  validateAssertionPeriod,
  validateFiscalCode,
  validateInResponseTo,
} = require("../../app/modules/lollipop/assertionValidation");

async function buildAssertion({
  fiscalCode = "AAAAAA00A00A000A",
  notBefore = new Date(Date.now() - 1000).toISOString(),
  notOnOrAfter = new Date(Date.now() - 1000).toISOString(),
} = {}) {
  const { publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const publicKeyBase64 = Buffer.from(
    JSON.stringify(publicKey.export({ format: "jwk" })),
  ).toString("base64url");

  const assertionRef = await computeThumbprintWithCrypto(
    "SHA_256",
    publicKeyBase64,
  );

  const assertion = `
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" IssueInstant="${notBefore}">
      <saml:Issuer>https://idp.example.test</saml:Issuer>
      <saml:Subject>
        <saml:SubjectConfirmation>
          <saml:SubjectConfirmationData InResponseTo="${assertionRef}" />
        </saml:SubjectConfirmation>
      </saml:Subject>
      <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}" />
      <saml:AttributeStatement>
        <saml:Attribute Name="fiscalNumber">
          <saml:AttributeValue>TINIT-${fiscalCode}</saml:AttributeValue>
        </saml:Attribute>
      </saml:AttributeStatement>
    </saml:Assertion>
  `;

  return {
    assertion,
    assertionRef,
    publicKeyBase64,
  };
}

describe("assertionValidation", () => {
  it("validates period, fiscal code and public-key thumbprint binding", async () => {
    const fiscalCode = "AAAAAA00A00A000A";

    const { assertion, assertionRef, publicKeyBase64 } = await buildAssertion({
      fiscalCode,
    });

    const assertionDoc = buildDocumentFromAssertion(assertion);

    const isAssertionPeriodValid = await Promise.resolve(
      validateAssertionPeriod(assertionDoc, 365),
    );

    expect(isAssertionPeriodValid).to.equal(true);

    expect(validateFiscalCode(fiscalCode, assertionDoc)).to.equal(true);

    await expect(
      validateInResponseTo(assertionRef, publicKeyBase64, assertionDoc),
    ).to.eventually.equal(true);
  });

  it("uses NotOnOrAfter as the FIMS assertion time reference", async () => {
    const { assertion } = await buildAssertion({
      notBefore: "2020-01-01T00:00:00.000Z",
    });
    const assertionDoc = buildDocumentFromAssertion(assertion);

    const isAssertionPeriodValid = await Promise.resolve(
      validateAssertionPeriod(assertionDoc, 365),
    );

    expect(isAssertionPeriodValid).to.equal(true);
  });

  it("accepts a future NotOnOrAfter because FIMS only enforces maximum age", async () => {
    const { assertion } = await buildAssertion({
      notOnOrAfter: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const assertionDoc = buildDocumentFromAssertion(assertion);

    const isAssertionPeriodValid = await Promise.resolve(
      validateAssertionPeriod(assertionDoc, 365),
    );

    expect(isAssertionPeriodValid).to.equal(true);
  });

  it("rejects a NotOnOrAfter value older than 365 days", async () => {
    const { assertion } = await buildAssertion({
      notOnOrAfter: new Date(
        Date.now() - 366 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
    const assertionDoc = buildDocumentFromAssertion(assertion);

    const isAssertionPeriodValid = await Promise.resolve(
      validateAssertionPeriod(assertionDoc, 365),
    );

    expect(isAssertionPeriodValid).to.equal(false);
  });

  it("detects a fiscal code different from the one in the assertion", async () => {
    const { assertion } = await buildAssertion();
    const assertionDoc = buildDocumentFromAssertion(assertion);

    expect(validateFiscalCode("BBBBBB00B00B000B", assertionDoc)).to.equal(
      false,
    );
  });

  it("extracts the public key thumbprint from assertion_ref", () => {
    const keyId = getAssertionReferenceKeyId(
      "sha256-thumbprint-with-base64url-hyphens",
    );

    expect(keyId).to.equal("thumbprint-with-base64url-hyphens");
  });
});
