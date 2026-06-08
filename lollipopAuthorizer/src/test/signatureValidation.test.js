import { expect  } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import { DOMParser, XMLSerializer  } from "@xmldom/xmldom";
import { validateSignature  } from "../app/signatureValidation.js";
import { VALIDATION_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import LollipopAssertionException from "../app/exception/lollipopAssertionException.js";
import { VALID_ASSERTION_XML, 
    VALID_IDP_CERTIFICATE
 } from "./constants/lollipopConstantsTest.js";

describe('signatureValidation Tests - Complete Suite', () => {
    
    describe('Basic Signature Validation', () => {
        
        it('should return true with valid certificate and signature', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: [VALID_IDP_CERTIFICATE]
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should throw MISSING_ASSERTION_SIGNATURE when signature element not found', () => {
            const xmlWithoutSignature = `<?xml version="1.0" encoding="UTF-8"?>
                <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="_assertion123" IssueInstant="2023-04-26T13:23:47Z">
                    <saml:Conditions NotBefore="2023-04-26T13:21:47Z" 
                                      NotOnOrAfter="2023-04-26T13:25:47Z"/>
                </saml:Assertion>`;
            
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(xmlWithoutSignature, 'text/xml');
            
            const idpCertDataList = [{
                certData: [VALID_IDP_CERTIFICATE]
            }];
            
            expect(() => validateSignature(assertionDoc, idpCertDataList))
                .to.throw(LollipopAssertionException)
                .with.property('errorCode', VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE);
        });
        
        it('should return false when signature is invalid', () => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const assertions = doc.getElementsByTagNameNS(
                'urn:oasis:names:tc:SAML:2.0:assertion',
                'Assertion'
            );
            
            if (assertions && assertions.length > 0) {
                const attributeValues = assertions[0].getElementsByTagNameNS(
                    'urn:oasis:names:tc:SAML:2.0:assertion',
                    'AttributeValue'
                );
                
                if (attributeValues && attributeValues.length > 0) {
                    attributeValues[0].textContent = 'TAMPERED_VALUE_TO_BREAK_SIGNATURE';
                }
            }
            
            const idpCertDataList = [{
                certData: [VALID_IDP_CERTIFICATE]
            }];
            
            const result = validateSignature(doc, idpCertDataList);
            
            expect(result).to.be.false;
        });
    });
    
    describe('Real-World Data Structures', () => {
        it('should validate with SPID structure (certData as STRING)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                entityId: 'https://posteid.poste.it',
                tag: '1762542302',
                certData: VALID_IDP_CERTIFICATE 
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should validate with CIE structure (certData with newlines)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const cieCertWithNewlines = VALID_IDP_CERTIFICATE
                .match(/.{1,64}/g)  
                .join('\n');
            
            const idpCertDataList = [{
                entityId: 'https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO',
                tag: '1662830039',
                certData: cieCertWithNewlines 
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should validate with mixed certData structures', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: 'INVALID_CERT_STRING' },         
                { certData: ['INVALID_CERT_IN_ARRAY'] },      
                { certData: VALID_IDP_CERTIFICATE }           
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
    });
    
    describe('Fail-Safe Multi-Certificate Strategy', () => {
        it('should succeed when valid certificate is after invalid one', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: [
                    'INVALID_CERTIFICATE_BASE64_DATA',  
                    VALID_IDP_CERTIFICATE               
                ]
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should return false when all certificates are invalid', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: [
                    'INVALID_CERT_1',
                    'INVALID_CERT_2',
                    'INVALID_CERT_3'
                ]
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.false;
        });
        
        it('should try all certificate sets (multiple IdpCertData)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: ['INVALID_CERT_SET_1'] },
                { certData: [VALID_IDP_CERTIFICATE] }, 
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
    });
    
    describe('Certificate Format Edge Cases', () => {
        it('should handle certificate already in PEM format', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const pemCert = `-----BEGIN CERTIFICATE-----
${VALID_IDP_CERTIFICATE}
-----END CERTIFICATE-----`;
            
            const idpCertDataList = [{
                certData: pemCert
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle certificate with extra whitespace', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const certWithWhitespace = `  \n\t${VALID_IDP_CERTIFICATE}\n  \t`;
            
            const idpCertDataList = [{
                certData: certWithWhitespace
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle corrupted certificate gracefully (not base64)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: 'NOT_VALID_BASE64_!!!@#$%^&*()'
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.false;
        });
        
        it('should handle empty certificate string', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: ''
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.false;
        });
    });
    
    describe('Null/Undefined/Empty Data Handling', () => {
        it('should handle empty certData array gracefully', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: [] },
                { certData: [VALID_IDP_CERTIFICATE] }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle malformed IdpCertData gracefully (null certData)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: null },
                { certData: [VALID_IDP_CERTIFICATE] }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle undefined certData gracefully', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: undefined }, 
                { certData: [VALID_IDP_CERTIFICATE] }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should return false with empty idpCertDataList', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const result = validateSignature(assertionDoc, []);
            
            expect(result).to.be.false;
        });
        
        it('should handle IdpCertData without certData property', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { entityId: 'https://test.it' },
                { certData: [VALID_IDP_CERTIFICATE] }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
    });
    
    describe('XML Malformation Handling', () => {
        it('should handle assertion with multiple signatures (use first)', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [{
                certData: [VALID_IDP_CERTIFICATE]
            }];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle empty assertion document', () => {
            const emptyXml = '<?xml version="1.0"?><root/>';
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(emptyXml, 'text/xml');
            
            const idpCertDataList = [{
                certData: [VALID_IDP_CERTIFICATE]
            }];
            
            expect(() => validateSignature(assertionDoc, idpCertDataList))
                .to.throw(LollipopAssertionException)
                .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION);
        });
    });
    
    describe('Integration Scenarios', () => {
        it('should validate with real SPID IdpCertData structure', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                {
                    entityId: 'https://posteid.poste.it',
                    tag: '1762542302',
                    certData: VALID_IDP_CERTIFICATE
                },
                {
                    entityId: 'https://posteid.poste.it',
                    tag: '1762256102',
                    certData: VALID_IDP_CERTIFICATE
                }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should validate with multiple IDP providers', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { entityId: 'https://loginspid.aruba.it', certData: 'INVALID_ARUBA_CERT' },
                { entityId: 'https://identity.infocert.it', certData: 'INVALID_INFOCERT_CERT' },
                { entityId: 'https://posteid.poste.it', certData: VALID_IDP_CERTIFICATE },
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
    });
    
    describe('Type Validation', () => {
        it('should handle certData as number gracefully', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: 12345 },  
                { certData: VALID_IDP_CERTIFICATE }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
        
        it('should handle certData as object gracefully', () => {
            const parser = new DOMParser();
            const assertionDoc = parser.parseFromString(VALID_ASSERTION_XML, 'text/xml');
            
            const idpCertDataList = [
                { certData: { invalid: 'object' } }, 
                { certData: VALID_IDP_CERTIFICATE }
            ];
            
            const result = validateSignature(assertionDoc, idpCertDataList);
            
            expect(result).to.be.true;
        });
    });

    describe('PN-19959 - namespace ereditato dal Response (caso register.it)', () => {
        const INHERITED_NS_RESPONSE_XML = '<saml2p:Response xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="_resp000" IssueInstant="2030-01-01T00:00:00Z" Version="2.0"><saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" ID="_pn19959synthetic000000000000000" IssueInstant="2030-01-01T00:00:00Z" Version="2.0"><saml2:Issuer>https://synthetic-idp.example</saml2:Issuer><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#_pn19959synthetic000000000000000"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"><InclusiveNamespaces PrefixList="xs" xmlns="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transform><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"><InclusiveNamespaces PrefixList="xs" xmlns="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>NohHSVUBlZWz2NOlD2NICQUIgvI+x8QI7ADsojs7YX8=</DigestValue></Reference></SignedInfo><SignatureValue>PLAx4tQUjp3hm58bcluTHUAv6gy8B/1cNewA0QEOTs9VPFwV1t9xOiXlkcAzOzqyqVNJY2YymB6TISakp+pJaq/ZvvgmNNRwWVUicp1Si77Le7bFzEV//8PiQYQizuMv1fwUnOAfxUMdSzN/tALBrmuPiezZ/N8Ju3nNSmkKfv6mwakFIieYH6E3k1VjhSxktYlu0MhXtJR0HTtZil/6Sim8NSWuZa+0RqnTv9/Cfj1ulZ0TSrtja53iuujZ5DJa0UZKvSWOqCGYa5D13nn9E6eqqCyy49yG1gaQ34NXq8H+U3J5oFSq3yPlMI/Pli+z1BbE+betszZ11uSZrGOBRQ==</SignatureValue></Signature><saml2:Subject><saml2:NameID>SYNTH-SUBJECT</saml2:NameID></saml2:Subject><saml2:Conditions NotBefore="2030-01-01T00:00:00Z" NotOnOrAfter="2030-01-01T01:00:00Z"/><saml2:AttributeStatement><saml2:Attribute Name="fiscalNumber"><saml2:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">TINIT-SYNTH00A00A000A</saml2:AttributeValue></saml2:Attribute></saml2:AttributeStatement></saml2:Assertion></saml2p:Response>';

        const SYNTHETIC_TEST_CERT = 'MIIDFzCCAf+gAwIBAgIUbG9yrMEhlZqnGvws9V1I/ZV34nkwDQYJKoZIhvcNAQELBQAwGzEZMBcGA1UEAwwQdGVzdC1pZHAtUE4xOTk1OTAeFw0yNjA2MDQxMDUxNDNaFw0zNjA2MDExMDUxNDNaMBsxGTAXBgNVBAMMEHRlc3QtaWRwLVBOMTk5NTkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDLn+71jmZ9ITHJAIp0egiVx06Pog7N4p8k5GyFmqDhHVxcdxL93WMZ3OojK5T4oerl8O7RXwDVepmKzyuaCD3eBVDt8ZTZDopIUfPHTLINfKh1fcaQO2+No+C776E0GGa2yAYZzvsFF+m4SH6ep1ZdLjOc4odk5FVSXZDPHJzoE73Gl82p3G1C+wPrq4pZdGQRBPQWDYy6bxyQE5R4M8Gv/D7Z7q+xU6npRw9uWHBt7JuJz/V4o41cuEZ3vvibg2rrSUxvwyqdWlYC/8tsPxft74sDs51z/3X+vhfvAxbLwXFVrLsoPa7HB8uYEZy36Q6betFkqplUZ1JM++Qhj3OTAgMBAAGjUzBRMB0GA1UdDgQWBBRVqbzXkyBan9+Ltxczvgy+lqHMrzAfBgNVHSMEGDAWgBRVqbzXkyBan9+Ltxczvgy+lqHMrzAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAkWiDQAj87kpOpJuh6xd9LaCOMrqjSLrwAsIAVlZ6CAdIiiwsRvqkV3aBJzn0jpPZnci5XXCPAtoNAybG2XC7t5WflN6+DEiKWISJAt+0s5unO2nYb74JUBoELn1lvdvytoKQVG/4v4pt+6TP4HDSNgmeokh8rJnOflFPPiSfV98p/DHYWEIdeZhgHfbdDWwvjL051HUZjcPkDIIloTHaZjF6HZ8XshDEeuIkofTP2akB/MN3oYD+dJ5RIQ8xA6vbvyni52IWyu/oG7KzOBMMjdUGyJkSRHu5+v85N3fTnQQEnlpvV0dP76nbtABViQrAFR33SI4DdPrpTsI1/mQo4';

        it('deve validare la firma di un Assertion con namespace ereditato dal Response', () => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(INHERITED_NS_RESPONSE_XML, 'text/xml');

            const result = validateSignature(doc, [{ certData: [SYNTHETIC_TEST_CERT] }]);

            expect(result).to.be.true;
        });
    });
});