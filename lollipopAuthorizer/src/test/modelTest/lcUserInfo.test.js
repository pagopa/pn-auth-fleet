import { expect  } from "chai";
import LCUserInfo from "../../app/openapiImpl/getAssertion/model/LCUserInfo.js";
import SamlUserInfo from "../../app/openapiImpl/getAssertion/model/SamlUserInfo.js";
import OidcUserInfo from "../../app/openapiImpl/getAssertion/model/OidcUserInfo.js";

describe('LCUserInfo', () => {

    const sampleSaml = { response_xml: '<SAML>Test</SAML>' };
    const sampleOidc = { id_token: 'sample-id-token', claims_token: 'sample-claims' };

    describe('constructor', () => {
        it('should construct from a SamlUserInfo instance', () => {
            const samlInstance = new SamlUserInfo(sampleSaml.response_xml);
            const instance = new LCUserInfo(samlInstance);
            expect(instance.getActualInstance().response_xml).to.equal(samlInstance.response_xml);
        });

        it('should construct from a plain SamlUserInfo object', () => {
            const instance = new LCUserInfo(sampleSaml);
            expect(instance.getActualInstance()).to.be.instanceOf(SamlUserInfo);
            expect(instance.getActualInstance().response_xml).to.equal(sampleSaml.response_xml);
        });

        it('should construct from a plain OidcUserInfo object', () => {
            const instance = new LCUserInfo(sampleOidc);
            expect(instance.getActualInstance()).to.be.instanceOf(OidcUserInfo);
            expect(instance.getActualInstance().id_token).to.equal(sampleOidc.id_token);
            expect(instance.getActualInstance().claims_token).to.equal(sampleOidc.claims_token);
        });

        it('should throw an error for invalid input', () => {
            expect(() => new LCUserInfo({ invalid: 'data' })).to.throw(/No match found constructing `LCUserInfo`/);
        });

        it('should throw an error if multiple matches (very unlikely)', () => {
            const multiMatchObj = {
                response_xml: '<SAML>test</SAML>',
                id_token: 'sample-id-token',
                claims_token: 'sample-claims'
            };
            expect(() => new LCUserInfo(multiMatchObj)).to.throw(/Multiple matches found constructing `LCUserInfo`/);
        });
    });

    describe('fromJSON / toJSON', () => {
        it('should serialize and deserialize SamlUserInfo correctly', () => {
            const instance = new LCUserInfo(sampleSaml);
            const json = JSON.stringify(instance.toJSON());
            const newInstance = LCUserInfo.fromJSON(json);
            expect(newInstance.getActualInstance()).to.be.instanceOf(SamlUserInfo);
            expect(newInstance.getActualInstance().response_xml).to.equal(sampleSaml.response_xml);
        });

        it('should serialize and deserialize OidcUserInfo correctly', () => {
            const instance = new LCUserInfo(sampleOidc);
            const json = JSON.stringify(instance.toJSON());
            const newInstance = LCUserInfo.fromJSON(json);
            expect(newInstance.getActualInstance()).to.be.instanceOf(OidcUserInfo);
            expect(newInstance.getActualInstance().id_token).to.equal(sampleOidc.id_token);
            expect(newInstance.getActualInstance().claims_token).to.equal(sampleOidc.claims_token);
        });
    });
});
