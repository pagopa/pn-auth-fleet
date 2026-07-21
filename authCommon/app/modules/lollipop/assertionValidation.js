const crypto = require("node:crypto");
const { DOMParser } = require("@xmldom/xmldom");
const LollipopValidationError = require("./LollipopValidationError");
const {
  MILLISECONDS_PER_DAY,
  AssertionRefAlgorithms,
} = require("./lollipopConstants");
const { lollipopConfig } = require("./lollipopConfig");
const { VALIDATION_ERROR_CODES } = require("./lollipopErrorsConstants");

/**
 * Validates the current FIMS Lollipop assertion age rule.
 *
 * FIMS requires Conditions@NotOnOrAfter not to be older than the configured max age.
 * No additional check requiring NotOnOrAfter to be before now is currently applied.
 *
 * @param {Document} assertionDoc - SAML assertion XML document
 * @param {number} assertionExpireInDays - Max assertion age in days
 * @returns {Promise<boolean>} true when the assertion satisfies the rule
 * @throws {LollipopValidationError} when parsing fails or dates are invalid
 */
async function validateAssertionPeriod(
  assertionDoc,
  assertionExpireInDays = lollipopConfig.assertionExpireInDays,
) {
  const listElements = assertionDoc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionConditionsTag,
  );

  const firstConditionsElement = listElements?.[0];
  const notOnOrAfter = firstConditionsElement?.getAttribute(
    lollipopConfig.notOnOrAfterAttribute,
  );

  if (!notOnOrAfter) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_ON_OR_AFTER_DATE,
      "The NotOnOrAfter parameter is not valid or an error occurred during parsing",
    );
  }

  const notOnOrAfterMilliseconds = Date.parse(notOnOrAfter);

  if (Number.isNaN(notOnOrAfterMilliseconds)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_ON_OR_AFTER_DATE,
      "The NotOnOrAfter parameter is not valid or an error occurred during parsing",
    );
  }

  const maxAssertionAgeMilliseconds =
    assertionExpireInDays * MILLISECONDS_PER_DAY;
  const oldestAcceptedTimestamp =
    new Date().getTime() - maxAssertionAgeMilliseconds;

  if (
    Number.isNaN(maxAssertionAgeMilliseconds) ||
    Number.isNaN(oldestAcceptedTimestamp)
  ) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_DATE,
      "The assertion maximum age is invalid or a parsing error occurred",
    );
  }

  return notOnOrAfterMilliseconds >= oldestAcceptedTimestamp;
}

/**
 * Validates the fiscal code by comparing the caller-provided value and the SAML assertion
 */
function validateFiscalCode(fiscalCode, assertionDoc) {
  const userIdFromAssertion = getUserIdFromAssertion(assertionDoc);

  if (!userIdFromAssertion) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.MISSING_USER_ID,
      "Missing or invalid Fiscal Code in the retrieved saml assertion",
    );
  }

  return userIdFromAssertion === fiscalCode;
}

/**
 * Extracts the fiscal code from the SAML assertion
 */
function getUserIdFromAssertion(assertionDoc) {
  const listElements = assertionDoc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionAttributeTag,
  );

  if (!listElements || listElements.length === 0) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.MISSING_USER_ID,
      "No elements found in the retrieved saml assertion",
    );
  }

  for (let i = 0; i < listElements.length; i += 1) {
    const item = listElements.item(i);
    if (!item || !item.attributes) continue;

    const nameAttr = item.getAttribute("Name");

    if (nameAttr === "fiscalNumber" && item.textContent) {
      return item.textContent.trim().replace("TINIT-", "");
    }
  }

  return null;
}

/**
 * Checks whether the first XML element or the requested attribute is missing
 */
function isElementNotFound(listElements, attributeName) {
  const firstElement = listElements?.[0];

  return !firstElement?.getAttribute(attributeName);
}

/**
 * Validates InResponseTo against assertion_ref and public_key
 */
async function validateInResponseTo(
  assertionRef,
  publicKeyBase64Url,
  assertionDoc,
) {
  const listElements = assertionDoc.getElementsByTagNameNS(
    lollipopConfig.samlNamespaceAssertion,
    lollipopConfig.assertionInResponseToTag,
  );

  if (isElementNotFound(listElements, lollipopConfig.inResponseToAttribute)) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IN_RESPONSE_TO_FIELD_NOT_FOUND,
      "Missing request id in the retrieved saml assertion",
    );
  }

  const firstInResponseToElement = listElements[0];
  const inResponseTo = firstInResponseToElement.getAttribute(
    lollipopConfig.inResponseToAttribute,
  );
  const hashAlgorithm = retrieveInResponseToAlgorithm(inResponseTo);
  const calculatedThumbprint = await computeThumbprintWithCrypto(
    hashAlgorithm,
    publicKeyBase64Url,
  );

  return inResponseTo === calculatedThumbprint && inResponseTo === assertionRef;
}

function retrieveInResponseToAlgorithm(inResponseTo) {
  if (!inResponseTo || typeof inResponseTo !== "string") {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.IN_RESPONSE_TO_EMPTY_OR_INVALID,
      "InResponseTo value is missing or not a string",
    );
  }

  const algorithms = [
    AssertionRefAlgorithms.SHA256,
    AssertionRefAlgorithms.SHA384,
    AssertionRefAlgorithms.SHA512,
  ];

  for (const algo of algorithms) {
    if (algo.pattern.test(inResponseTo)) {
      return algo.hashAlgorithm;
    }
  }

  throw new LollipopValidationError(
    VALIDATION_ERROR_CODES.IN_RESPONSE_TO_ALGORITHM_NOT_VALID,
    "InResponseTo in the assertion does not contain a valid assertion ref or contains an invalid algorithm",
  );
}

/**
 * Computes the public key thumbprint using the crypto module.
 */
async function computeThumbprintWithCrypto(
  inResponseToAlgorithm,
  publicKeyBase64Url,
) {
  let jwkObject;

  try {
    const jwkJsonString = Buffer.from(publicKeyBase64Url, "base64url").toString(
      "utf8",
    );
    jwkObject = JSON.parse(jwkJsonString);
  } catch (error) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY,
      `Unable to parse Lollipop public key: ${error.message}`,
      error,
    );
  }

  const hashAlgorithmPrefix = inResponseToAlgorithm
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const cryptoHashAlgorithm = hashAlgorithmPrefix;

  // Normalize the JWK according to RFC 7638, section 3.2
  let membersToThumbprint;

  switch (jwkObject.kty) {
    case "RSA":
      membersToThumbprint = {
        e: jwkObject.e,
        kty: jwkObject.kty,
        n: jwkObject.n,
      };
      break;

    case "EC":
      membersToThumbprint = {
        crv: jwkObject.crv,
        kty: jwkObject.kty,
        x: jwkObject.x,
        y: jwkObject.y,
      };
      break;

    case "OKP":
      membersToThumbprint = {
        crv: jwkObject.crv,
        kty: jwkObject.kty,
        x: jwkObject.x,
      };
      break;

    default:
      throw new LollipopValidationError(
        VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY,
        `Unsupported JWK key type: ${jwkObject.kty}`,
      );
  }

  const canonicalJwkString = JSON.stringify(membersToThumbprint);

  const thumbprintBuffer = crypto
    .createHash(cryptoHashAlgorithm)
    .update(canonicalJwkString)
    .digest();

  const calculatedThumbprint = thumbprintBuffer.toString("base64url");
  return `${hashAlgorithmPrefix}-${calculatedThumbprint}`;
}

/**
 * Builds the XML document from the SAML assertion
 */
function buildDocumentFromAssertion(assertionXml) {
  if (typeof assertionXml !== "string" || assertionXml.trim() === "") {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "SAML assertion is missing",
    );
  }

  // DOCTYPE declarations are not allowed in assertion XML
  if (assertionXml.includes("<!DOCTYPE")) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "DOCTYPE is not allowed in assertion XML",
    );
  }

  try {
    return new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (msg) => {
          throw new Error(msg);
        },
        fatalError: (msg) => {
          throw new Error(msg);
        },
      },
    }).parseFromString(assertionXml, "text/xml");
  } catch (error) {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      error.message,
      error,
    );
  }
}

function getAssertionReferenceKeyId(assertionRef) {
  const separatorIndex = assertionRef.indexOf("-");

  return assertionRef.slice(separatorIndex + 1);
}

module.exports = {
  validateAssertionPeriod,
  validateFiscalCode,
  validateInResponseTo,
  buildDocumentFromAssertion,
  computeThumbprintWithCrypto,
  getAssertionReferenceKeyId,
};
