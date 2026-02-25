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
  ISSUE_INSTANT: "IssueInstant",
  ISSUER_ENTITY_ID_TAG: "Issuer",
  ENTITIES_DESCRIPTOR_TAG: "EntitiesDescriptor",
  NAMESPACE_TAG: "md:",
  ENTITY_DESCRIPTOR_TAG: "EntityDescriptor",
  IDPSSO_DESCRIPTOR_TAG: "IDPSSODescriptor",
  KEY_DESCRIPTOR_TAG: "KeyDescriptor",
  DS_KEYINFO_TAG: "ds:KeyInfo",
  DS_X509DATA_TAG: "ds:X509Data",
  DS_X509CERTIFICATE_TAG: "ds:X509Certificate",
  assertionInResponseToTag: "SubjectConfirmationData",
  inResponseToAttribute: "InResponseTo",
  assertionInstantTag: "Assertion",
  samlNamespaceSignature:'http://www.w3.org/2000/09/xmldsig#',
  signatureTag:"Signature",
  lollipopBlock:"false"
};

const IDP_PROVIDER_CONFIG = {
    CIE_ENTITY_ID: [ "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO" ],
    BASE_URI: "https://api.is.eng.pagopa.it",
    IDP_KEYS_CIE_ENDPOINT: "/idp-keys/cie",
    IDP_KEYS_SPID_ENDPOINT: "/idp-keys/spid",
    TIMEOUT_API: 60000, // READ_TIMEOUT_MS,
    CONNECTION_TIMEOUT_API: 60000, //CONNECTION_TIMEOUT_MS,
}

const ASSERTION_PROVIDER_CONFIG = {
    BASE_URI: "https://api.is.eng.pagopa.it",
    ASSERTION_REQUEST_ENDPOINT: "/assertions",
    SUBSCRIPTION_KEY: "",
}

export { lollipopConfig, IDP_PROVIDER_CONFIG, ASSERTION_PROVIDER_CONFIG };