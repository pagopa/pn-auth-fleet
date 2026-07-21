const LollipopValidationError = require("./LollipopValidationError");
const { VALIDATION_ERROR_CODES } = require("./lollipopErrorsConstants");
const { lollipopConfig } = require("./lollipopConfig");
const {
  buildDocumentFromAssertion,
  getAssertionReferenceKeyId,
  validateAssertionPeriod,
  validateFiscalCode,
  validateInResponseTo,
} = require("./assertionValidation");
const { getIdpCertData } = require("./idpCertProvider");
const { validateSignature } = require("./signatureValidation");
const { verifyHttpSignature } = require("./verifyHttpSignature");

/**
 * Validates the Lollipop core using data already available to the caller.
 *
 * The module does not know API Gateway, FIMS, or the Custom Authorizer. It
 * receives only the SAML assertion, caller-provided identity data, signed HTTP
 * headers and IdP certificate provider configuration.
 */
async function validateLollipop(input) {
  validateInput(input);

  const headers = normalizeHeaders(input.headers);
  validateExpectedSignedHeaders(headers, input.expectedSignedHeaders);

  const assertionDoc = buildDocumentFromAssertion(input.assertion);
  const idpCertDataList = await getIdpCertData(assertionDoc, input.idpConfig);
  const requiredSignedHeaders = Object.keys(input.expectedSignedHeaders || {});
  const assertionKeyId = getAssertionReferenceKeyId(input.assertionRef);

  const validations = [
    validateAssertionPeriod(assertionDoc, input.assertionExpireInDays).then(
      (isValid) => {
        if (!isValid) {
          throw new LollipopValidationError(
            VALIDATION_ERROR_CODES.INVALID_ASSERTION_PERIOD,
            "The assertion has expired",
          );
        }
      },
    ),

    Promise.resolve(validateFiscalCode(input.fiscalCode, assertionDoc)).then(
      (isValid) => {
        if (!isValid) {
          throw new LollipopValidationError(
            VALIDATION_ERROR_CODES.INVALID_USER_ID,
            "The fiscal code in the assertion does not match the provided fiscal code",
          );
        }
      },
    ),

    validateInResponseTo(
      input.assertionRef,
      input.publicKey,
      assertionDoc,
    ).then((isValid) => {
      if (!isValid) {
        throw new LollipopValidationError(
          VALIDATION_ERROR_CODES.INVALID_IN_RESPONSE_TO,
          "The public key thumbprint, assertion_ref and InResponseTo do not match",
        );
      }
    }),

    Promise.resolve(validateSignature(assertionDoc, idpCertDataList)).then(
      (isValid) => {
        if (!isValid) {
          throw new LollipopValidationError(
            VALIDATION_ERROR_CODES.INVALID_ASSERTION_SIGNATURE,
            "The assertion signature is not valid",
          );
        }
      },
    ),

    verifyHttpSignature(
      headers[lollipopConfig.signatureHeader],
      headers[lollipopConfig.signatureInputHeader],
      headers,
      input.publicKey,
      input.expectedNonce,
      assertionKeyId,
      requiredSignedHeaders,
    ),
  ];

  await Promise.all(validations);
}

function validateInput(input) {
  if (!input || typeof input !== "object") {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "Lollipop validation input is required",
    );
  }

  for (const field of [
    "assertion",
    "assertionRef",
    "publicKey",
    "fiscalCode",
    "expectedNonce",
  ]) {
    if (typeof input[field] !== "string" || input[field].trim() === "") {
      throw new LollipopValidationError(
        VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
        `Missing Lollipop validation input: ${field}`,
      );
    }
  }
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== "object") {
    throw new LollipopValidationError(
      VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
      "Lollipop request headers are required",
    );
  }

  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([name, value]) => [name.toLowerCase(), String(value)]),
  );
}

function validateExpectedSignedHeaders(headers, expectedSignedHeaders = {}) {
  for (const [headerName, expectedValue] of Object.entries(
    expectedSignedHeaders,
  )) {
    const actualValue = headers[headerName.toLowerCase()];

    if (actualValue !== expectedValue) {
      throw new LollipopValidationError(
        VALIDATION_ERROR_CODES.INVALID_SIGNED_HEADER_VALUE,
        `Lollipop header ${headerName} does not match the expected callback value`,
      );
    }
  }
}

module.exports = {
  validateLollipop,
};
