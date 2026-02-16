import { expect } from 'chai';
import OidcUserInfo from '../../app/openapiImpl/getAssertion/model/OidcUserInfo.js';

describe('OidcUserInfo', () => {

  const sampleData = {
    id_token: 'sample-id-token',
    claims_token: 'sample-claims'
  };

  describe('constructFromObject', () => {
    it('should create a valid OidcUserInfo instance', () => {
      const oidcUserInfo = OidcUserInfo.constructFromObject(sampleData);
      
      expect(oidcUserInfo).to.be.an.instanceOf(OidcUserInfo);
      expect(oidcUserInfo.id_token).to.equal(sampleData.id_token);
      expect(oidcUserInfo.claims_token).to.equal(sampleData.claims_token);
    });

    it('should handle null input', () => {
      const result = OidcUserInfo.constructFromObject(null);
      expect(result).to.be.null;
    });

    it('should handle undefined input', () => {
      const result = OidcUserInfo.constructFromObject(undefined);
      expect(result).to.be.null;
    });

    it('should handle empty object', () => {
      const oidcUserInfo = OidcUserInfo.constructFromObject({});
      
      expect(oidcUserInfo).to.be.an.instanceOf(OidcUserInfo);
      expect(oidcUserInfo.id_token).to.be.undefined;
      expect(oidcUserInfo.claims_token).to.be.undefined;
    });
  });

  describe('property access', () => {
    let oidcUserInfo;

    beforeEach(() => {
      oidcUserInfo = new OidcUserInfo();
      oidcUserInfo.id_token = sampleData.id_token;
      oidcUserInfo.claims_token = sampleData.claims_token;
    });

    it('should correctly set and get id_token', () => {
      expect(oidcUserInfo.id_token).to.equal(sampleData.id_token);
    });

    it('should correctly set and get claims_token', () => {
      expect(oidcUserInfo.claims_token).to.equal(sampleData.claims_token);
    });
  });
});
