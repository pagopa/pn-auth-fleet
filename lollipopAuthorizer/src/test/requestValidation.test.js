const { expect } = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const base64url = require('base64url');
const {
  validatePublicKey,
  LollipopRequestContentValidationException,
} = require('../app/requestValidation');

const { EC_JWK, RSA_JWK, VALIDATION_ERROR_CODES } = require('../app/constants/lollipopConstants');

describe('validatePublicKey (async)', () => {
  // precodifica delle due chiavi in base64url
  const ecKeyBase64 = base64url.encode(JSON.stringify(EC_JWK));
  const rsaKeyBase64 = base64url.encode(JSON.stringify(RSA_JWK));

  // test con una chiave EC valida -> no exception
  it('Valid EC_JWK publicKey', async () => {
    await expect(validatePublicKey(ecKeyBase64)).to.be.fulfilled;
  });

  // test con una chiave RSA valida -> no exception
  it('Valid RSA_JWK publicKey', async () => {
    await expect(validatePublicKey(rsaKeyBase64)).to.be.fulfilled;
  });

  // test chiave mancante -> exception
  it('should throw MISSING_PUBLIC_KEY if publicKey is null', async () => {
    try {
      await validatePublicKey(null);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY);
    }
  });

  // test stringa non codificata in base64url -> exception
  it('should throw INVALID_PUBLIC_KEY if publicKey is not base64url', async () => {
    try {
      await validatePublicKey('%%%NOT_BASE64');
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY);
    }
  });

 // test contenuto decodificato non è JSON un valido -> exception
  it('should throw INVALID_PUBLIC_KEY if publicKey is not JSON', async () => {
    const notJson = base64url.encode('not a json');
    try {
      await validatePublicKey(notJson);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY);
    }
  });

  //test con chiave di un tipo non supportato (kty) -> exception
  it('should throw INVALID_PUBLIC_KEY for unsupported kty', async () => {
    const unsupported = base64url.encode(JSON.stringify({
      kty: 'unsupported'
    }));
    try {
      await validatePublicKey(unsupported);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY);
    }
  });
});
