const {expect} = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const xmldom = require('xmldom');
const path = require('path');
const fs = require('fs').promises;
const {ErrorRetrievingIdpCertDataException} = require('../../app/exception/errorRetrievingIdpCertDataException');
const CertDataNotFoundException = require('../../app/exception/certDataNotFoundException');
const { VALIDATION_ERROR_CODES } = require('../../app/constants/lollipopConstants'); //, SAML_ASSERTION, IDP_PROVIDER_CONFIG
const {lollipopConfig, IDP_PROVIDER_CONFIG} = require('../../app/config/lollipopConsumerRequestConfig');
const { ASSERTION_SPID_XML_WITH_VALID_ENTITY_ID_WITHOUT_CERT,
 ASSERTION_CIE_XML_WITH_VALID_ENTITY_ID_WITH_CERT,
 ASSERTION_SPID_XML_WITH_VALID_ENTITY_ID_WITH_CERT } = require('../fileTest/testUtils');
const { getIdpCertData, parseInstantToUnixTimestamp } = require('../../app/service/assertionVerifierService');
const idpCertProvider = require('../../app/openapiImpl/idp/idpCertProvider');

describe('getIdpCertData ', async () => {

    console.log('getIdpCertData TEST');

    it('TEST 1 - SPID dovrebbe restituire un IdpCertData[] valido', async () => {

        console.log('TEST 1 - SPID Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {

        //  LETTURA DA FILE
        //    const getAssertionXMLPath = path.join(__dirname, '..//fileTest//getAssertion.xml');
        //    console.log("gestAssertionPath: " , getAssertionXMLPath);
        //    const getAssertionXmlString = await fs.readFile(getAssertionXMLPath, 'utf8');

            const getAssertionXmlString = ASSERTION_SPID_XML_WITH_VALID_ENTITY_ID_WITH_CERT;
            const parserXML = new xmldom.DOMParser();
            assertionDoc = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDoc.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDoc || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionTag);
            const firstConditionsElement = listElements[0];
            console.log(" firstConditionsElement: ", firstConditionsElement);
            const instant = firstConditionsElement.getAttribute(lollipopConfig.ISSUE_INSTANT);

            console.debug("instant: ", instant);
        }
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");
        const result = await getIdpCertData(assertionDoc);  //lista di IdpCertData

        expect(result).to.be.a('array').that.is.not.empty;

        console.log("RESULT (listCertData): ", result.length);
        for( const certDataElem of result){

            console.log("RESULT (certDataElem): ", certDataElem );
            console.log("RESULT (certDataElem.entityId): ", certDataElem.entityId);
            console.log("RESULT (certDataElem.tag): ", certDataElem.tag);
            console.log("RESULT (certDataElem.certData): ", certDataElem.certData);
        }

        console.log("---------------------------------------------");
    });



    it('TEST 2 - CIE dovrebbe restituire un IdpCertData[] valido', async () => {

        console.log('TEST 2 - CIE Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {
            const getAssertionXmlString = ASSERTION_CIE_XML_WITH_VALID_ENTITY_ID_WITH_CERT;

            const parserXML = new xmldom.DOMParser();
            assertionDoc = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDoc.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDoc || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionTag);
            const firstConditionsElement = listElements[0];
            const instant = firstConditionsElement.getAttribute(lollipopConfig.ISSUE_INSTANT);
            console.debug("instant: ", instant);
        }
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");
        const result = await getIdpCertData(assertionDoc);  //lista di IdpCertData

        expect(result).to.be.a('array').that.is.not.empty;

        console.log("RESULT (listCertData): ", result.length);
        for( const certDataElem of result){

            console.log("RESULT (certDataElem): ", certDataElem );
            console.log("RESULT (certDataElem.entityId): ", certDataElem.entityId);
            console.log("RESULT (certDataElem.tag): ", certDataElem.tag);
            console.log("RESULT (certDataElem.certData): ", certDataElem.certData);
        }

        console.log("---------------------------------------------");
    });



    it('TEST 3 - SPID validateLollipopGetIdpCertData Failure For IdpCertData Not Found Exception', async () => {

        console.log('TEST 3 - SPID Caricamento Document Assertion fake per test ');
        let assertionDoc;
        try {
            const getAssertionXmlString = ASSERTION_SPID_XML_WITH_VALID_ENTITY_ID_WITHOUT_CERT;

            const parserXML = new xmldom.DOMParser();
            assertionDoc = parserXML.parseFromString(getAssertionXmlString, "application/xml");
            if (assertionDoc.documentElement.nodeName === 'parsererror') {
                throw new Error("Errore di sintassi nel file XML. Parsing fallito.");
            }

        } catch (error) {
            console.error(`Errore durante il caricamento da file XML: ${error.message}`);
            throw error;
        }

        if(!assertionDoc || assertionDoc === undefined){
            console.error("test assertionDoc is NULL");
        }else{
            console.debug("test assertionDoc is NOT NULL");
            const listElements = assertionDoc.getElementsByTagNameNS(lollipopConfig.samlNamespaceAssertion, lollipopConfig.assertionTag);
            const firstConditionsElement = listElements[0];
            const instant = firstConditionsElement.getAttribute(lollipopConfig.ISSUE_INSTANT);
            console.debug("instant: ", instant);
        }
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");

        try {
            await getIdpCertData(assertionDoc);
            throw new Error('Expected exception was not thrown.');

        } catch (e) {
            // Verifica che l'errore sia del tipo corretto
            expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
        }
        console.log("---------------------------------------------");
    });


    it('TEST 5 - SPID CertData Failure for Wrong EntityID ', async () => {
        console.log('TEST 5 - SPID CertData Failure for Wrong EntityID ');
        let assertionDoc;

        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");

        try {

            const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:25.400Z");
            await idpCertProvider.getIdpCertData(parserizedInstant, "https://postXXXXXXX.pugigste.it" );
            throw new Error('Expected exception was not thrown.');

        } catch (e) {
            // Verifica che l'errore sia del tipo corretto
            console.error("ERROR: ",e);
            expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
        }
        console.log("---------------------------------------------");
    });

    it('TEST 5 - SPID CertData Failure for Wrong EntityID ', async () => {
        console.log('TEST 5 - SPID CertData Failure for Wrong EntityID ');
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");
        try {
            const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:25.400Z");
            await idpCertProvider.getIdpCertData(parserizedInstant, "https://postXXXXXXX.pugigste.it" );
            throw new Error('Expected exception was not thrown.');
        } catch (e) {
            // Verifica che l'errore sia del tipo corretto
            console.error("ERROR: ",e);
            expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
        }
        console.log("---------------------------------------------");
    });

    it('TEST 6 - SPID CertData Failure for Wrong instant ', async () => {
        console.log('TEST 6 - SPID CertData Failure for Wrong instant ');
        console.log("---------------------------------------------");
        console.log("getIdpCertData ...");
        try {
            const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:88.400Z");
            await idpCertProvider.getIdpCertData(parserizedInstant, "https://posteid.poste.it" );
            throw new Error('Expected exception was not thrown.');
        } catch (e) {
            // Verifica che l'errore sia del tipo corretto
            console.error("ERROR: ",e);
            expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
        }
        console.log("---------------------------------------------");
    });


        it('TEST 7 - CIE CertData Failure for Wrong instant ', async () => {
            console.log('TEST 7 - CIE CertData Failure for Wrong instant ');
            console.log("---------------------------------------------");
            console.log("getIdpCertData ...");
            try {
                const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:88.400Z");
                await idpCertProvider.getIdpCertData(parserizedInstant, IDP_PROVIDER_CONFIG.CIE_ENTITY_ID );
                throw new Error('Expected exception was not thrown.');
            } catch (e) {
                // Verifica che l'errore sia del tipo corretto
                console.error("ERROR: ",e);
                expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
            }
            console.log("---------------------------------------------");
        });


        it('TEST 8 -  CertData Failure for ENTITY_ID is null ', async () => {
            console.log('TEST 8 - CertData Failure for ENTITY_ID is null');
            console.log("---------------------------------------------");
            console.log("getIdpCertData ...");
            try {
                const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:25.400Z");
                await idpCertProvider.getIdpCertData(parserizedInstant, null );
                throw new Error('Expected exception was not thrown.');
            } catch (e) {
                // Verifica che l'errore sia del tipo corretto
                console.error("ERROR: ",e);
                expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
            }
            console.log("---------------------------------------------");
        });

        it('TEST 9 - CertData Failure for Wrong instant NULL', async () => {
            console.log('TEST 9 -  CertData Failure for Wrong instant NULL');
            console.log("---------------------------------------------");
            console.log("getIdpCertData ...");
            try {
               // const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:88.400Z");
                await idpCertProvider.getIdpCertData(null, IDP_PROVIDER_CONFIG.CIE_ENTITY_ID );
                throw new Error('Expected exception was not thrown.');
            } catch (e) {
                // Verifica che l'errore sia del tipo corretto
                console.error("ERROR: ",e);
                expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
            }
            console.log("---------------------------------------------");
        });


        it('TEST 10 - SPID_ENTITY_ID_MULTIPLE_SIGNATURE', async () => {
            console.log('TEST 10 - SPID_ENTITY_ID_MULTIPLE_SIGNATURE');
            console.log("---------------------------------------------");
            console.log("getIdpCertData ...");
            try {
                const parserizedInstant = parseInstantToUnixTimestamp("2023-02-28T16:27:25.400Z");
                const result = await idpCertProvider.getIdpCertData(parserizedInstant, "https://loginspid.aruba.it" );
                expect(result).to.be.a('array');
            } catch (e) {
                // Verifica che l'errore sia del tipo corretto
                console.error("ERROR: ",e);
                expect(e).to.be.an.instanceOf(ErrorRetrievingIdpCertDataException);
            }
            console.log("---------------------------------------------");
        });


});