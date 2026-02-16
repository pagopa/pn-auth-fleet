import { expect  } from "chai";
import sinon from "sinon";
import { getAssertionDoc, buildDocumentFromAssertion  } from "../app/assertionValidation.js";
import { getAssertion  } from "../app/service/assertionService.js";
import client from "../app/client/assertionClient.js";
import { ASSERTION_ERROR_CODES  } from "../app/constants/lollipopErrorsConstants.js";
import { VALID_ASSERTION_XML, VALIDATION_PARAMS, VALID_JWT  } from "../test/constants/lollipopConstantsTest.js";
import OidcAssertionNotSupported from "../app/exception/oidcAssertionNotSupported.js";
import ErrorRetrievingAssertionException from "../app/exception/errorRetrievingAssertionException.js";
import LollipopAssertionNotFoundException from "../app/exception/lollipopAssertionNotFoundException.js";
import nock from "nock";
import DefaultApi from "../app/openapiImpl/getAssertion/api/DefaultApi.js";

describe("buildDocumentFromAssertion", () => {
    it("should parse valid XML", () => {
        const doc = buildDocumentFromAssertion({ assertionData: VALID_ASSERTION_XML });
        expect(doc).to.exist;
    });

    it("should throw on DOCTYPE", () => {
        const xml = "<!DOCTYPE test><root></root>";
        try {
            buildDocumentFromAssertion({ assertionData: xml });
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.ERROR_PARSING_ASSERTION);
        }
    });

    it("should throw on malformed XML", () => {
        const xml = "<saml:Assertion><InvalidTag";
        try {
            buildDocumentFromAssertion({ assertionData: xml });
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.ERROR_PARSING_ASSERTION);
        }
    });
});

//mock
describe("getAssertion", () => {
    afterEach(() => sinon.restore());

    it("should return assertion when client returns valid object", async () => {
        sinon.stub(client, "getAssertionFromClient").resolves({ assertionData: VALID_ASSERTION_XML });
        const res = await getAssertion(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
        expect(res.assertionData).to.equal(VALID_ASSERTION_XML);
    });

    it("should throw NotFound error when client returns null", async () => {
        sinon.stub(client, "getAssertionFromClient").resolves(null);
        try {
            await getAssertion(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND);
        }
    });

    it("should rethrow OIDC error as proper code", async () => {
        sinon.stub(client, "getAssertionFromClient").rejects(new OidcAssertionNotSupported(
            ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED,
            "OIDC not supported"
        ));
        try {
            await getAssertion(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED);
        }
    });

    it("should wrap an unknown error", async () => {
        sinon.stub(client, "getAssertionFromClient").rejects(new Error("ERROR"));
        try {
            await getAssertion(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.message).to.contain("Unexpected error:");
        }
    });
});

//mock
describe("getAssertionDoc", () => {
    afterEach(() => sinon.restore());

    it("should return a document (happy path)", async () => {
        sinon.stub(client, "getAssertionFromClient").resolves({ assertionData: VALID_ASSERTION_XML });
        const doc = await getAssertionDoc(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
        expect(doc).to.exist;
        expect(doc.getElementsByTagName("saml:NameID").length).to.equal(1);
    });

    it("should convert OIDC error to proper code", async () => {
        sinon.stub(client, "getAssertionFromClient").rejects(new OidcAssertionNotSupported(ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED));
        try {
            await getAssertionDoc(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
            throw new ErrorRetrievingAssertionException(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND);
        } catch (e) {
            console.log("Errore catturato:", e);
            console.log("instanceof OidcAssertionNotSupported:", e instanceof OidcAssertionNotSupported);
            console.log("errorCode:", e.errorCode);
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.OIDC_ASSERTION_TYPE_NOT_SUPPORTED);
        }
    });

    it("should convert NotFound to proper code", async () => {
        sinon.stub(client, "getAssertionFromClient").rejects(new LollipopAssertionNotFoundException(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND));
        try {
            await getAssertionDoc(VALID_JWT, VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
            throw new Error("Should not reach");
        } catch (e) {
            expect(e.errorCode).to.equal(ASSERTION_ERROR_CODES.SAML_ASSERTION_NOT_FOUND);
        }
    });
});

describe("DefaultApi (mock)", function () {
    let instance;

    beforeEach(function () {
        instance = new DefaultApi();
    });

    it("should call getAssertion successfully (mocked)", function (done) {
        const samlAssertion = VALID_ASSERTION_XML;
        console.log("REF:", VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256);
        console.log("JWT:", VALIDATION_PARAMS.VALID_JWT);


        // intercetta la chiamata HTTP
        nock('http://localhost:3000')
            .get(`/assertions/${VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256}`)
            .reply(200, {
                response_xml: samlAssertion
            });

        instance.getAssertion(VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256, VALIDATION_PARAMS.VALID_JWT, function (err, data) {
            if (err) return done(err);

            console.log("DATA: ", data);
            expect(data).to.not.be.null;
            const xml = data.actualInstance.response_xml;
            expect(
                xml.includes("<saml:Assertion") || xml.includes("<saml2:Assertion")
            ).to.be.true;
            done();
        });
    });
});