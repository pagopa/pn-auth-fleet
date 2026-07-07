const spidXmlOneKeyDescriptor = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntitiesDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                       xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                         entityID="https://posteid.poste.it">
        <md:IDPSSODescriptor WantAuthnRequestsSigned="true"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <md:KeyDescriptor use="signing">
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>POSTE_SIGNING_CERT_CONTENT</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
        </md:IDPSSODescriptor>
    </md:EntityDescriptor>
</md:EntitiesDescriptor>`;

const cieXmlTwoKeyDescriptors = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                  entityID="https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO">
    <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <KeyDescriptor use="signing">
            <ds:KeyInfo>
                <ds:X509Data>
                    <ds:X509Certificate>CIE_SIGNING_CERT_CONTENT</ds:X509Certificate>
                </ds:X509Data>
            </ds:KeyInfo>
        </KeyDescriptor>
        <KeyDescriptor use="encryption">
            <ds:KeyInfo>
                <ds:X509Data>
                    <ds:X509Certificate>CIE_ENCRYPTION_CERT_CONTENT</ds:X509Certificate>
                </ds:X509Data>
            </ds:KeyInfo>
        </KeyDescriptor>
    </IDPSSODescriptor>
</EntityDescriptor>`;

module.exports = {
	spidXmlOneKeyDescriptor,
	cieXmlTwoKeyDescriptors,
};
