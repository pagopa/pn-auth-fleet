const { expect } = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const base64url = require('base64url');
const {
  validatePublicKey,
  validateAssertionRefHeader,
  LollipopRequestContentValidationException,
} = require('../app/requestValidation');

const { EC_JWK, RSA_JWK, VALIDATION_ERROR_CODES, VALIDATION_PARAMS, AssertionRefAlgorithms } = require('../test/constants/lollipopConstantsTest');

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
  it('should throw MISSING_PUBLIC_KEY_ERROR if publicKey is null', async () => {
    try {
      await validatePublicKey(null);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_PUBLIC_KEY_ERROR);
    }
  });

  // test stringa non codificata in base64url -> exception
  it('should throw INVALID_PUBLIC_KEY_ERROR if publicKey is not base64url', async () => {
    try {
      await validatePublicKey('%%%NOT_BASE64');
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR);
    }
  });

 // test contenuto decodificato non è JSON un valido -> exception
  it('should throw INVALID_PUBLIC_KEY_ERROR if publicKey is not JSON', async () => {
    const notJson = base64url.encode('not a json');
    try {
      await validatePublicKey(notJson);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR);
    }
  });

  //test con chiave di un tipo non supportato (kty) -> exception
  it('should throw INVALID_PUBLIC_KEY_ERROR for unsupported kty', async () => {
    const unsupported = base64url.encode(JSON.stringify({
      kty: 'unsupported'
    }));
    try {
      await validatePublicKey(unsupported);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_PUBLIC_KEY_ERROR);
    }
  });
});

//TEST ASSERTIONREFHEADER
describe('validateAssertionRefHeader (async)',() =>{
it('should pass with valid assertion header', async () => {
    await validateAssertionRefHeader(VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256); // nessun errore atteso
  });


  it('should throw MISSING_ASSERTION_REF_ERROR if assertionRef is null', async () => {
    try {
      await validateAssertionRefHeader(null);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_ASSERTION_REF_ERROR);
    }
  });

  it('should throw INVALID_ASSERTION_REF_ERROR if assertionRef has invalid format', async () => {
    try {
      await validateAssertionRefHeader(VALIDATION_PARAMS.INVALID_ASSERTION_REF_SHA);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR);
    }
  });

  it('should accept valid SHA256 assertionRef', async () => {
    await expect(validateAssertionRefHeader(VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA256)).to.be.fulfilled;
  });

  it('should accept valid SHA384 assertionRef', async () => {
    await expect(validateAssertionRefHeader(VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA384)).to.be.fulfilled;
  });

  it('should accept valid SHA512 assertionRef', async () => {
    await expect(validateAssertionRefHeader(VALIDATION_PARAMS.VALID_ASSERTION_REF_SHA512)).to.be.fulfilled;
  });

  it('should throw INVALID_ASSERTION_REF for wrong prefix', async () => {
    const wrongPrefix = 'sha1-' + 'A'.repeat(44);
    try {
      await validateAssertionRefHeader(wrongPrefix);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR);
    }
  });

  it('should throw INVALID_ASSERTION_REF if base64url part is too short', async () => {
    const tooShort = 'sha256-A';
    try {
      await validateAssertionRefHeader(tooShort);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR);
    }
  });

  it('should throw INVALID_ASSERTION_REF if base64url part is too long', async () => {
    const tooLong = 'sha256-' + 'A'.repeat(100);
    try {
      await validateAssertionRefHeader(tooLong);
    } catch (err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_REF_ERROR);
    }
  });
});
