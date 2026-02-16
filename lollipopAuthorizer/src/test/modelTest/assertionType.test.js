import { expect  } from "chai";
import AssertionType from "../../app/openapiImpl/getAssertion/model/AssertionType.js";

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
