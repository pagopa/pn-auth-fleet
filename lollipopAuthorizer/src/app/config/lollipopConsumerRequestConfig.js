// config come LollipopConsumerRequestConfig sdk
const lollipopConfig = {
  signatureHeader: "signature",
  signatureInputHeader: "signature-input",
  publicKeyHeader: "x-pagopa-lollipop-public-key",
  userIdHeader: "x-pagopa-lollipop-user-id",
  samlNamespaceAssertion: "urn:oasis:names:tc:SAML:2.0:assertion",
  assertionTag: "Assertion",
  assertionNotBeforeTag: "Conditions",
  notBeforeAttribute: "NotBefore",
  assertionAttributeTag: "Attribute",
  assertionExpireInDays: 365,
};

module.exports = {
  lollipopConfig
};
