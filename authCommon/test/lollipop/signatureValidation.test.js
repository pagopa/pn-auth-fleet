const { DOMParser } = require("@xmldom/xmldom");
const { expect } = require("chai");

const {
  validateSignature,
} = require("../../app/modules/lollipop/signatureValidation");
const {
  validSignedAssertionXml,
  validIdpCertificate,
} = require("./fixtures/signedAssertion");

const samlAssertionNamespace = "urn:oasis:names:tc:SAML:2.0:assertion";

function buildAssertionDocument(assertionXml = validSignedAssertionXml) {
  return new DOMParser().parseFromString(assertionXml, "text/xml");
}

describe("signatureValidation", () => {
  it("validates a real signed SAML assertion with the matching IdP certificate", () => {
    const assertionDoc = buildAssertionDocument();

    const result = validateSignature(assertionDoc, [
      {
        entityId: "https://spid-testenv2:8088",
        tag: "historical-tag",
        certData: [validIdpCertificate],
      },
    ]);

    expect(result).to.equal(true);
  });

  it("returns false when the signed assertion content is modified", () => {
    const assertionDoc = buildAssertionDocument();
    const attributeValues = assertionDoc.getElementsByTagNameNS(
      samlAssertionNamespace,
      "AttributeValue",
    );

    expect(attributeValues.length).to.be.greaterThan(0);

    attributeValues[0].textContent = "TAMPERED_VALUE_TO_BREAK_SIGNATURE";

    const result = validateSignature(assertionDoc, [
      {
        entityId: "https://spid-testenv2:8088",
        tag: "historical-tag",
        certData: [validIdpCertificate],
      },
    ]);

    expect(result).to.equal(false);
  });

  it("tries the next IdP certificate when a previous certificate is invalid", () => {
    const assertionDoc = buildAssertionDocument();

    const result = validateSignature(assertionDoc, [
      {
        entityId: "https://spid-testenv2:8088",
        tag: "latest-tag",
        certData: ["INVALID_CERTIFICATE_BASE64_DATA"],
      },
      {
        entityId: "https://spid-testenv2:8088",
        tag: "historical-tag",
        certData: [validIdpCertificate],
      },
    ]);

    expect(result).to.equal(true);
  });
});
