import { expect } from 'chai';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import xml2js from 'xml2js';
import IdpCertClient from '../app/openapiImpl/idp/client/idpCertClient.js';

const SPID_XML_ONE_KEY_DESCRIPTOR = `<?xml version="1.0" encoding="UTF-8"?>
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

const SPID_XML_TWO_KEY_DESCRIPTORS = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntitiesDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                       xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                         entityID="https://loginspid.aruba.it">
        <md:IDPSSODescriptor WantAuthnRequestsSigned="true"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <md:KeyDescriptor use="signing">
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>ARUBA_SIGNING_CERT_1</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
            <md:KeyDescriptor use="signing">
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>ARUBA_SIGNING_CERT_2</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
        </md:IDPSSODescriptor>
    </md:EntityDescriptor>
</md:EntitiesDescriptor>`;

const CIE_XML_TWO_KEY_DESCRIPTORS = `<?xml version="1.0" encoding="UTF-8"?>
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

function makeMockResponseData(xmlString) {
    return {
        getActualInstance: () => Buffer.from(xmlString, 'utf8'),
    };
}

function makeIdpCertClientWithSpidMock(xmlString) {
    const client = new IdpCertClient({}, {});
    client.defaultApi = {
        idpKeysSpidTagGet: (tag, callback) => {
            callback(null, makeMockResponseData(xmlString), null);
        },
    };
    return client;
}

function makeIdpCertClientWithCieMock(xmlString) {
    const client = new IdpCertClient({}, {});
    client.defaultApi = {
        idpKeysCieTagGet: (tag, callback) => {
            callback(null, makeMockResponseData(xmlString), null);
        },
    };
    return client;
}

describe('[PN-19317] IdpCertClient — parsing XML metadata IDP', () => {

    describe('xml2js — struttura prodotta per KeyDescriptor singolo (SPID)', () => {

        it('xml2js pone gli attributi XML sotto la chiave $ (non come proprieta diretta)', async () => {
            const parser = new xml2js.Parser({ explicitArray: false });
            const parsed = await new Promise((resolve, reject) => {
                parser.parseString(SPID_XML_ONE_KEY_DESCRIPTOR, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            const entitiesDesc = parsed['md:EntitiesDescriptor'];
            const entityDesc = entitiesDesc['md:EntityDescriptor'];
            const idpSso = entityDesc['md:IDPSSODescriptor'];
            const keyDescriptor = idpSso['md:KeyDescriptor'];

            expect(Array.isArray(keyDescriptor)).to.be.false;
            expect(keyDescriptor).to.have.property('$');
            expect(keyDescriptor['$']).to.have.property('use', 'signing');
            expect(keyDescriptor.use).to.be.undefined;
        });
    });

    describe('getSPIDCertData — SPID IDP con un solo KeyDescriptor (PosteID)', () => {

        it('[RED] deve estrarre il certificato di firma quando il KeyDescriptor e unico', async () => {
            const client = makeIdpCertClientWithSpidMock(SPID_XML_ONE_KEY_DESCRIPTOR);
            const result = await client.getSPIDCertData('20230228', 'https://posteid.poste.it');

            expect(result).to.not.be.null;
            expect(result.entityId).to.equal('https://posteid.poste.it');
            expect(result.certData).to.deep.equal(['POSTE_SIGNING_CERT_CONTENT']);
            expect(result.tag).to.equal('20230228');
        });
    });

    describe('getSPIDCertData — SPID IDP con un solo KeyDescriptor use="encryption"', () => {

        it('deve restituire null quando il KeyDescriptor unico non e uso signing', async () => {
            const xmlEncryptionOnly = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntitiesDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                       xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                         entityID="https://example-idp.it">
        <md:IDPSSODescriptor WantAuthnRequestsSigned="true"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <md:KeyDescriptor use="encryption">
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>ENCRYPTION_ONLY_CERT</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
        </md:IDPSSODescriptor>
    </md:EntityDescriptor>
</md:EntitiesDescriptor>`;

            const client = makeIdpCertClientWithSpidMock(xmlEncryptionOnly);
            await expect(
                client.getSPIDCertData('20230228', 'https://example-idp.it')
            ).to.be.rejected;
        });
    });

    describe('getSPIDCertData — SPID IDP con KeyDescriptor privo di attributo use', () => {

        it('deve restituire null quando il KeyDescriptor unico non ha attributo use', async () => {
            const xmlNoUse = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntitiesDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                       xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                         entityID="https://example-idp.it">
        <md:IDPSSODescriptor WantAuthnRequestsSigned="true"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <md:KeyDescriptor>
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>NO_USE_ATTR_CERT</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </md:KeyDescriptor>
        </md:IDPSSODescriptor>
    </md:EntityDescriptor>
</md:EntitiesDescriptor>`;

            const client = makeIdpCertClientWithSpidMock(xmlNoUse);
            await expect(
                client.getSPIDCertData('20230228', 'https://example-idp.it')
            ).to.be.rejected;
        });
    });

    describe('getSPIDCertData — SPID IDP con due KeyDescriptor (Aruba)', () => {

        it('[PASS] deve estrarre il primo certificato di firma quando ci sono due KeyDescriptor', async () => {
            const client = makeIdpCertClientWithSpidMock(SPID_XML_TWO_KEY_DESCRIPTORS);
            const result = await client.getSPIDCertData('20230228', 'https://loginspid.aruba.it');

            expect(result).to.not.be.null;
            expect(result.entityId).to.equal('https://loginspid.aruba.it');
            expect(result.certData).to.be.an('array').and.not.empty;
        });
    });

    describe('getCIECertData — CIE (due KeyDescriptor: signing + encryption)', () => {

        it('[PASS] deve estrarre il certificato di firma CIE', async () => {
            const client = makeIdpCertClientWithCieMock(CIE_XML_TWO_KEY_DESCRIPTORS);
            const result = await client.getCIECertData('20230228', 'https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO');

            expect(result).to.not.be.null;
            expect(result.entityId).to.equal('https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO');
            expect(result.certData).to.deep.equal(['CIE_SIGNING_CERT_CONTENT']);
            expect(result.tag).to.equal('20230228');
        });
    });

    describe('getSPIDCertData - EntitiesDescriptor con un solo EntityDescriptor (branch oggetto in unpackNestedSignature)', () => {

        it('deve estrarre il certificato quando EntitiesDescriptor contiene un solo EntityDescriptor', async () => {
            const client = makeIdpCertClientWithSpidMock(SPID_XML_ONE_KEY_DESCRIPTOR);
            const result = await client.getSPIDCertData('20230228', 'https://posteid.poste.it');

            expect(result).to.not.be.null;
            expect(result.entityId).to.equal('https://posteid.poste.it');
            expect(result.certData).to.deep.equal(['POSTE_SIGNING_CERT_CONTENT']);
            expect(result.tag).to.equal('20230228');
        });
    });
});
