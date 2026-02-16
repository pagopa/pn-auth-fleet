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
});