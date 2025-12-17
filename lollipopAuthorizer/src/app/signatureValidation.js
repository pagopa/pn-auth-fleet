const { SignedXml } = require('xml-crypto');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const LollipopAssertionException = require('./exception/lollipopAssertionException');
const { VALIDATION_ERROR_CODES } = require('./constants/lollipopErrorsConstants');
const { BEGIN_CERTIFICATE, END_CERTIFICATE } = require('./constants/lollipopConstants');
const ValidationException = require('./exception/validationException');
const { lollipopConfig } = require('../app/config/lollipopConsumerRequestConfig');

/**
 * 
 * @param {Document} doc 
 * @returns {Document} 
 * @throws {LollipopAssertionException} 
 */
function extractAssertion(doc) {
    console.log('[extractAssertion] Searching for Assertion in document...');
    
    const assertions = doc.getElementsByTagNameNS(
        lollipopConfig.samlNamespaceAssertion,
        lollipopConfig.assertionTag
    );
    
    if (!assertions || assertions.length === 0) {
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION,
            'No Assertion found in document'
        );
    }
    
    if (assertions.length > 1) {
        console.warn(`[extractAssertion] Found ${assertions.length} Assertions, using the first one`);
    }
    
    let assertionElement = null;
    let assertionId = null;
    
    for (let i = 0; i < assertions.length; i++) {
        const assertion = assertions[i];
        const id = assertion.getAttribute('ID');
        
        if (!id) {
            console.warn(`[extractAssertion] Assertion at index ${i} missing ID attribute, skipping...`);
            continue;
        }
        
        const signatures = assertion.getElementsByTagNameNS(
            lollipopConfig.samlNamespaceSignature,
            lollipopConfig.signatureTag
        );
        
        if (signatures && signatures.length > 0) {
            assertionElement = assertion;
            assertionId = id;
            console.log(`[extractAssertion] Found signed Assertion with ID: ${assertionId}`);
            break;
        } else {
            console.warn(`[extractAssertion] Assertion with ID ${id} is not signed, skipping...`);
        }
    }
    
    if (!assertionElement) {
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE,
            'No signed Assertion found in document'
        );
    }
    
    if (doc.documentElement === assertionElement) {
        console.log('[extractAssertion] Document root is already the target Assertion');
        return doc;
    }
    
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const assertionXml = serializer.serializeToString(assertionElement);
    const assertionDoc = parser.parseFromString(assertionXml, 'text/xml');
    
    console.log('[extractAssertion] Assertion extracted successfully from wrapper');
    return assertionDoc;
}

/**
 * 
 * @param {Document} assertionDoc
 * @param {Array} idpCertDataList
 * @returns {boolean}
 * @throws {LollipopAssertionException}
 */
function validateSignature(assertionDoc, idpCertDataList) {
    console.log('[validateSignature] Starting SAML signature validation.');
    
    try {
        assertionDoc = extractAssertion(assertionDoc);
    } catch (error) {
        console.error('[validateSignature] Failed to extract Assertion:', error.message);
        throw error;
    }
    
    const signatureElements = assertionDoc.getElementsByTagNameNS(
        lollipopConfig.samlNamespaceSignature,
        lollipopConfig.signatureTag
    );
    
    if (!signatureElements || signatureElements.length === 0) {
        console.error('[validateSignature] No signature found in SAML assertion');
        throw new LollipopAssertionException(
            VALIDATION_ERROR_CODES.MISSING_ASSERTION_SIGNATURE,
            'The assertion does not have a signature'
        );
    }
    
    const signatureElement = signatureElements[0];
    console.log('[validateSignature] Signature element found');
    
    const signatureReferences = signatureElement.getElementsByTagNameNS(
        lollipopConfig.samlNamespaceSignature,
        'Reference'
    );
    if (signatureReferences && signatureReferences.length > 0) {
        const refUri = signatureReferences[0].getAttribute('URI');
        console.log(`[validateSignature] Signature Reference URI: ${refUri}`);
    }
    
    const xmlString = new XMLSerializer().serializeToString(assertionDoc);
    
    let attemptCount = 0;
    let lastError = null;
    
    for (const idpCertData of idpCertDataList) {
        let certDataArray;
        
        if (!idpCertData.certData) {
            console.warn('[validateSignature] Missing certData, skipping...');
            continue;
        }
        
        if (typeof idpCertData.certData === 'string') {
            certDataArray = [idpCertData.certData];
        } else if (Array.isArray(idpCertData.certData)) {
            certDataArray = idpCertData.certData;
        } else {
            console.warn('[validateSignature] Invalid certData type, skipping...');
            continue;
        }
        
        for (const certData of certDataArray) {
            attemptCount++;
            try {
                console.log(`[validateSignature] Attempt ${attemptCount}: Testing certificate...`);
                
                const certificatePEM = getX509CertificatePEM(certData);
                const isValid = verifyXmlSignature(signatureElement, xmlString, certificatePEM);
                
                if (isValid) {
                    console.log(`[validateSignature] ✅ Signature validated with certificate ${attemptCount}`);
                    return true;
                }
                
            } catch (err) {
                lastError = err;
                console.warn(`[validateSignature] Certificate ${attemptCount} failed: ${err.message}`);
                continue;
            }
        }
    }
    
    console.error('[validateSignature]  No certificate validated the signature.');
    if (lastError) {
        console.error('[validateSignature] Last error:', lastError.message);
    }
    return false;
}

/**
 * 
 * @param {Element} signatureElement 
 * @param {string} xmlString 
 * @param {string} certificatePEM 
 * @returns {boolean} 
 * @throws {ValidationException} 
 */
function verifyXmlSignature(signatureElement, xmlString, certificatePEM) {
    try {
        const sig = new SignedXml({ publicCert: certificatePEM });
        sig.loadSignature(signatureElement);
        
        const isValid = sig.checkSignature(xmlString);
        
        if (!isValid) {
            const errors = sig.validationErrors || [];
            throw new ValidationException(
                'Signature validation failed',
                errors.join(', ')
            );
        }
        
        return true;
        
    } catch (error) {
        throw new ValidationException(
            'XML signature verification failed',
            error.message
        );
    }
}

/**
 * 
 * @param {string} certBase64 
 * @returns {string} 
 * @throws {ValidationException}
 */
function getX509CertificatePEM(certBase64) {
    try {
        const cleanCert = certBase64.trim();
        
        if (cleanCert.includes(BEGIN_CERTIFICATE)) {
            return cleanCert;
        }
        
        return `${BEGIN_CERTIFICATE}\n${cleanCert}\n${END_CERTIFICATE}`;
        
    } catch (error) {
        throw new ValidationException(
            'Failed to format X.509 certificate',
            error.message
        );
    }
}

module.exports = {
    validateSignature,
    extractAssertion 
}