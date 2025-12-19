const { expect } = require('chai');
const OidcUserInfo = require('../../app/openapiImpl/getAssertion/model/OidcUserInfo');

describe('OidcUserInfo', () => {

  const sampleData = {
    id_token: 'sample-id-token',
    claims_token: 'sample-claims'
  };

  describe('constructor', () => {
    it('should construct an instance with given tokens', () => {
      const instance = new OidcUserInfo(sampleData.id_token, sampleData.claims_token);
      expect(instance.id_token).to.equal(sampleData.id_token);
      expect(instance.claims_token).to.equal(sampleData.claims_token);
    });
  });

  describe('constructFromObject', () => {
    it('should construct an instance from plain object', () => {
      const instance = OidcUserInfo.constructFromObject(sampleData);
      expect(instance).to.be.instanceOf(OidcUserInfo);
      expect(instance.id_token).to.equal(sampleData.id_token);
      expect(instance.claims_token).to.equal(sampleData.claims_token);
    });

    it('should populate an existing object if passed', () => {
      const obj = new OidcUserInfo();
      const instance = OidcUserInfo.constructFromObject(sampleData, obj);
      expect(instance).to.equal(obj);
      expect(instance.id_token).to.equal(sampleData.id_token);
      expect(instance.claims_token).to.equal(sampleData.claims_token);
    });
  });

  describe('validateJSON', () => {
    it('should return true for valid data', () => {
      const result = OidcUserInfo.validateJSON(sampleData);
      expect(result).to.be.true;
    });

    it('should throw error if required fields are missing', () => {
      const invalidData = { id_token: 'token-only' };
      expect(() => OidcUserInfo.validateJSON(invalidData)).to.throw(
        /The required field `claims_token` is not found/
      );
    });

    it('should throw error if fields are not strings', () => {
      const invalidData = { id_token: 123, claims_token: {} };
      expect(() => OidcUserInfo.validateJSON(invalidData)).to.throw(
        /Expected the field `id_token` to be a primitive type/
      );
    });
  });

});
