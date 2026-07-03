const lollipopConfig = {
  signatureHeader: "signature",
  signatureInputHeader: "signature-input",
  samlNamespaceAssertion: "urn:oasis:names:tc:SAML:2.0:assertion",
  assertionTag: "Assertion",
  assertionConditionsTag: "Conditions",
  notOnOrAfterAttribute: "NotOnOrAfter",
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
  samlNamespaceSignature: "http://www.w3.org/2000/09/xmldsig#",
  signatureTag: "Signature",
};

module.exports = {
  lollipopConfig,
};
