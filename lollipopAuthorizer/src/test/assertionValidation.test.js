const {expect} = require('chai');
const chai = require('chai');
const xmldom = require('xmldom');
const path = require('path');
const fs = require('fs').promises;
const { validateAssertionPeriod } = require('../app/assertionValidation');
const { VALIDATION_ERROR_CODES, SAML_ASSERTION } = require('../app/constants/lollipopConstants');
const LollipopAssertionException = require('../app/exception/lollipopAssertionException');


describe('validateAssertionPeriodTest ', () => {

    console.log('validateAssertionPeriod TEST');

    it('dovrebbe restituire TRUE quando la data è valida e non è scaduta', async () => {

        console.log('TEST 1 - Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {
            const getAssertionXMLPath = path.join(__dirname, 'fileTest//getAssertionTest.xml');
            console.log("gestAssertionPath: " , getAssertionXMLPath);
            const getAssertionXmlString = await fs.readFile(getAssertionXMLPath, 'utf8');
            const parserXML = new xmldom.DOMParser();
            assertionDoc = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDoc.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }
            console.log("TYPE assertionDoc: ", typeof assertionDoc);
            const rootElementName = assertionDoc.documentElement.localName;
            console.log("assertionDoc di test - rootElementName: " , rootElementName);

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDoc  || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.NOT_BEFORE_TAG);
            const firstConditionsElement = listElements[0];
            const notBefore = firstConditionsElement.getAttribute(SAML_ASSERTION.NOT_BEFORE);
            console.debug("notBefore: ", notBefore);
        }

        console.log("validateAssertionPeriod ...");
        const result = validateAssertionPeriod(assertionDoc);
        expect(result).to.be.true;
    });

    it('should throw ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE if notBefore is null or invalid', async() => {

        console.log('TEST 2 - Caricamento Document Assertion fake per test ');
        let assertionDocNotBeforeNull;
        try {
            const getAssertionXMLPath = path.join(__dirname, 'fileTest//getAssertionTestNotBeforeInvalid.xml');
            console.log("gestAssertionPath: " , getAssertionXMLPath);
            const getAssertionXmlString = await fs.readFile(getAssertionXMLPath, 'utf8');
            const parserXML = new xmldom.DOMParser();
            assertionDocNotBeforeNull = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDocNotBeforeNull.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDocNotBeforeNull  || assertionDocNotBeforeNull === undefined){
            console.error("test 2 assertionDoc is NULL");
        }else{
            console.debug("test 2 assertionDoc is NOT NULL");
            const listElements = assertionDocNotBeforeNull.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.NOT_BEFORE_TAG);
            const firstConditionsElement = listElements[0];
            const notBefore = firstConditionsElement.getAttribute(SAML_ASSERTION.NOT_BEFORE);
            console.debug("notBefore:", notBefore);
        }

        expect(() => validateAssertionPeriod(assertionDocNotBeforeNull))
        .to.throw(LollipopAssertionException)
        .with.property('errorCode', VALIDATION_ERROR_CODES.ERROR_PARSING_ASSERTION_NOT_BEFORE_DATE);

//            const result = validateAssertionPeriod(assertionDocNotBeforeNull);
//            expect(result).to.be.false;

      });

    it('dovrebbe restituire FALSE quando la data è scaduta', async () => {

        console.log('TEST 3 - Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {
            const getAssertionXMLPath = path.join(__dirname, 'fileTest//getAssertionTestNotBeforeFalse.xml');
            console.log("gestAssertionPath: " , getAssertionXMLPath);
            const getAssertionXmlString = await fs.readFile(getAssertionXMLPath, 'utf8');
            const parserXML = new xmldom.DOMParser();
            assertionDoc = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDoc.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }
            console.log("TYPE assertionDoc: ", typeof assertionDoc);
            const rootElementName = assertionDoc.documentElement.localName;
            console.log("assertionDoc di test - rootElementName: " , rootElementName);

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDoc  || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.NOT_BEFORE_TAG);
            const firstConditionsElement = listElements[0];
            const notBefore = firstConditionsElement.getAttribute(SAML_ASSERTION.NOT_BEFORE);
            console.debug("notBefore is OLD: ", notBefore);
        }

        console.log("validateAssertionPeriod ...");
        const result = validateAssertionPeriod(assertionDoc);
        expect(result).to.be.false;
    });

});


