import { expect  } from "chai";
import SamlUserInfo from "../../app/openapiImpl/getAssertion/model/SamlUserInfo.js";

describe('SamlUserInfo', () => {

  const sampleXml = '<SAML>Test</SAML>';

  describe('constructor', () => {
    it('should initialize response_xml', () => {
      const instance = new SamlUserInfo(sampleXml);
      expect(instance.response_xml).to.equal(sampleXml);
    });
  });

  describe('constructFromObject', () => {
    it('should create a new instance from plain object', () => {
      const data = { response_xml: sampleXml };
      const instance = SamlUserInfo.constructFromObject(data);
      expect(instance).to.be.instanceOf(SamlUserInfo);
      expect(instance.response_xml).to.equal(sampleXml);
    });

    it('should populate an existing instance', () => {
      const existing = new SamlUserInfo('old');
      const data = { response_xml: sampleXml };
      const instance = SamlUserInfo.constructFromObject(data, existing);
      expect(instance).to.equal(existing);
      expect(instance.response_xml).to.equal(sampleXml);
    });

    it('should ignore missing response_xml', () => {
      const data = {};
      const instance = SamlUserInfo.constructFromObject(data);
      expect(instance.response_xml).to.be.undefined;
    });
  });

  describe('validateJSON', () => {
    it('should return true for valid data', () => {
      const data = { response_xml: sampleXml };
      const result = SamlUserInfo.validateJSON(data);
      expect(result).to.be.true;
    });

    it('should throw if required property is missing', () => {
      const data = {};
      expect(() => SamlUserInfo.validateJSON(data)).to.throw(/The required field `response_xml` is not found/);
    });

    it('should throw if response_xml is not a string', () => {
      const data = { response_xml: 123 };
      expect(() => SamlUserInfo.validateJSON(data)).to.throw(/Expected the field `response_xml` to be a primitive type/);
    });
  });
});
