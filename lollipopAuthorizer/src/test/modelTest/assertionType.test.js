const { expect } = require('chai');
const AssertionType = require('../../app/openapiImpl/getAssertion/model/AssertionType');

describe('AssertionType', () => {

  it('should have SAML and OIDC values', () => {
    expect(AssertionType.SAML).to.equal('SAML');
    expect(AssertionType.OIDC).to.equal('OIDC');
  });

  it('constructFromObject should return the input object', () => {
    expect(AssertionType.constructFromObject('SAML')).to.equal('SAML');
    expect(AssertionType.constructFromObject('OIDC')).to.equal('OIDC');
  });

});
