const { SignedXml } = require("xml-crypto");
const { XMLSerializer } = require("@xmldom/xmldom");
const LollipopValidationError = require("./LollipopValidationError");
const { VALIDATION_ERROR_CODES } = require("./lollipopErrorsConstants");
const { BEGIN_CERTIFICATE, END_CERTIFICATE } = require("./lollipopConstants");
const { lollipopConfig } = require("./lollipopConfig");

function extractAssertion(doc) {
  const assertions = doc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionTag,
  );

  if (!assertions || assertions.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "No Assertion found in document",
    );
  }

  // @xmldom/xmldom returns an array-like NodeList that is not directly iterable.
  const assertionList = Array.from(assertions);

  let assertionElement = null;

  for (const assertion of assertionList) {
    const id = assertion.getAttribute("ID");

    if (!id) {
      continue;
    }

    const signatures = assertion.getElementsByTagNameNS(
      lollipopConfig.samlNamespaceSignature,
      lollipopConfig.signatureTag,
    );

    if (signatures && signatures.length > 0) {
      assertionElement = assertion;
      break;
    }
  }

  if (!assertionElement) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE,
      "No signed Assertion found in document",
    );
  }

  return assertionElement;
}

/**
 * Validates the XML signature of an assertion using IdP certificates
 */
function validateSignature(assertionDoc, idpCertDataList) {
  const assertionElement = extractAssertion(assertionDoc);

  const signatureElements = assertionElement.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceSignature,
    lollipopConfig.signatureTag,
  );

  if (!signatureElements || signatureElements.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE,
      "The assertion does not have a signature",
    );
  }

  const signatureElement = signatureElements[0];

  const legacyXmlString = new XMLSerializer().serializeToString(
    assertionElement,
  );
  if (attemptVerification(signatureElement, legacyXmlString, idpCertDataList)) {
    return true;
  }

  const inContextXmlString = new XMLSerializer().serializeToString(
    assertionElement.ownerDocument,
  );
  return attemptVerification(
    signatureElement,
    inContextXmlString,
    idpCertDataList,
  );
}

function attemptVerification(signatureElement, xmlString, idpCertDataList) {
  for (const idpCertData of idpCertDataList) {
    const certDataArray =
      typeof idpCertData.certData === "string"
        ? [idpCertData.certData]
        : idpCertData.certData;

    if (!Array.isArray(certDataArray)) {
      continue;
    }

    for (const certData of certDataArray) {
      try {
        const certificatePEM = getX509CertificatePEM(certData);

        if (verifyXmlSignature(signatureElement, xmlString, certificatePEM)) {
          return true;
        }
      } catch {
        // Continue with the next historical certificate
      }
    }
  }

  return false;
}

function verifyXmlSignature(signatureElement, xmlString, certificatePEM) {
  const sig = new SignedXml({ publicCert: certificatePEM });
  sig.loadSignature(signatureElement);

  const isValid = sig.checkSignature(xmlString);

  if (!isValid) {
    const errors = sig.validationErrors || [];
    throw new Error(`Signature validation failed: ${errors.join(", ")}`);
  }

  return true;
}

function getX509CertificatePEM(certBase64) {
  const cleanCert = certBase64.trim();

  if (cleanCert.includes(BEGIN_CERTIFICATE)) {
    return cleanCert;
  }

  return `${BEGIN_CERTIFICATE}\n${cleanCert}\n${END_CERTIFICATE}`;
}

module.exports = {
  validateSignature,
  extractAssertion,
};
