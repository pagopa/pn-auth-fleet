// config come LollipopConsumerRequestConfig sdk
const lollipopConfig = {
  signatureHeader: "signature",
  signatureInputHeader: "signature-input",
  publicKeyHeader: "x-pagopa-lollipop-public-key",
  assertionRefHeader: "x-pagopa-lollipop-assertion-ref",
  assertionTypeHeader: "x-pagopa-lollipop-assertion-type",
  originalMethodHeader: "x-pagopa-lollipop-original-method",
  originalURLHeader: "x-pagopa-lollipop-original-url",
  authJWTHeader: "x-pagopa-lollipop-auth-jwt",
  userGivenNameHeader: "x-pagopa-lollipop-user-name",
  userFamilyNameHeader: "x-pagopa-lollipop-user-family-name",
  userIdHeader: "x-pagopa-lollipop-user-id",
  expectedFirstLcOriginalUrl: "^https://api-app.io.pagopa.it/\\S+$",
  expectedFirstLcOriginalMethod: "POST;GET",
  samlNamespaceAssertion: "urn:oasis:names:tc:SAML:2.0:assertion",
  assertionTag: "Assertion",
  assertionNotBeforeTag: "Conditions",
  notBeforeAttribute: "NotBefore",
  assertionAttributeTag: "Attribute",
  assertionExpireInDays: 365,
  assertionInResponseToTag: "SubjectConfirmationData",
  inResponseToAttribute: "InResponseTo",
};

module.exports = {
  lollipopConfig
};