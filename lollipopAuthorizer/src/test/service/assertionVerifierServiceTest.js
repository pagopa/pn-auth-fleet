const {expect} = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const xmldom = require('xmldom');
const path = require('path');
const fs = require('fs').promises;
const ErrorRetrievingIdpCertDataException = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
//const IdpCertProvider = require('../../app/idp/idpCertProvider');
const { VALIDATION_ERROR_CODES, SAML_ASSERTION } = require('../../app/constants/lollipopConstants');
//const LollipopAssertionException = require('../../app/exception/lollipopAssertionException');
const { getIdpCertData } = require('../../app/service/assertionVerifierService');

describe('getIdpCertData ', async () => {

    console.log('getIdpCertData TEST');

    it('dovrebbe restituire un IdpCertData[] valido', async () => {

        console.log('TEST 1 - Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {
            const getAssertionXMLPath = path.join(__dirname, '..//fileTest//getAssertionTest.xml');
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

        if(!assertionDoc || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(SAML_ASSERTION.SAML2_ASSERTION_NS, SAML_ASSERTION.ASSERTION);
            const firstConditionsElement = listElements[0];
            const instant = firstConditionsElement.getAttribute(SAML_ASSERTION.ISSUE_INSTANT);
            console.debug("instant: ", instant);
        }
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");
        const result = await getIdpCertData(assertionDoc);
        console.log("RESULT (listCertData): ", result);
        expect(result).to.be.a('array');
        console.log("---------------------------------------------");
    });

});