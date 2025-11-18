const {expect} = require('chai');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const base64url = require('base64url');
const {
  validatePublicKey,
  validateUserIdHeader,
  validateAssertionRefHeader,
  validateAssertionTypeHeader,
  validateOriginalMethodHeader,
  LollipopRequestContentValidationException,
  validateAuthJWTHeader,
} = require('../app/requestValidation');

const {
  EC_JWK,
  RSA_JWK,
  VALIDATION_ERROR_CODES,
  VALIDATION_PARAMS,
  EXPECTED_FIRST_LC_ORIGINAL_METHOD
} = require('../test/constants/lollipopConstantsTest');
const {VALIDATION_AUTH_JWT} = require("./constants/lollipopConstantsTest");

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

describe('validateAuthJWTHeader (async)', () => {

    it("Valid header should not throw errors", async () => {
        await expect(function () {
            validateAuthJWTHeader(VALIDATION_AUTH_JWT.VALID)
        }).not.to.throw();
    });


    it("Missing header should throw MISSING_AUTH_JWT", async () => {
        try {
            validateAuthJWTHeader(VALIDATION_AUTH_JWT.MISSING);
        } catch (err) {
            expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
            expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_AUTH_JWT);
        }
    })

    it("Empty header should throw INVALID_AUTH_JWT", async () => {
        try {
            validateAuthJWTHeader(VALIDATION_AUTH_JWT.EMPTY);
        } catch (err) {
            expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
            expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_AUTH_JWT);
        }
    });
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

describe('validateAssertionTypeHeader (async)', async () => {
  it("should finish without errors if assertion is not null and compatible",async () => {
      await expect(function()  {
        validateAssertionTypeHeader(VALIDATION_PARAMS.VALID_ASSERTION_TYPE)
      }).not.to.throw();
  });
  it("should throw MISSING_ASSERTION_TYPE if assertion ref header is null", async () => {
    try {
      await validateAssertionTypeHeader(VALIDATION_PARAMS.MISSING_ASSERTION_TYPE);
    } catch(err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.MISSING_ASSERTION_TYPE_ERROR);
    }
  });

  it("should throw INVALID_ASSERTION_TYPE if assertion ref header is not compatible", async () => {
    try{
      await validateAssertionTypeHeader(VALIDATION_PARAMS.INVALID_ASSERTION_TYPE);
    } catch(err) {
      expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
      expect(err.errorCode).to.be.equal(VALIDATION_ERROR_CODES.INVALID_ASSERTION_TYPE_ERROR);
    }
  })
});

describe('validateUserIdHeader (async) ', () => {

    //test con valore userId blank
    it('should throw MISSING_USER_ID for blankUserId', () => {
        const blankUserId = null;
        try{
            validateUserIdHeader(blankUserId);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_USER_ID);
        }
    });

    //test con valore userId Non valido (Lunghezza errata)
    it('should throw INVALID_USER_ID for noValidUserId', () => {
        const noValidUserId = 'RSSMRA75C11H501';
        try {
            validateUserIdHeader(noValidUserId);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.INVALID_USER_ID);
        }
    });

    //test con valore userId valido -> no exception
    it('Valid USER_ID for validUserId', () => {
        const validUserId = 'TROMRA80A01H501F';
        validateUserIdHeader(validUserId);
    });

});

describe('validateOriginalMethodHeader (async)', () => {

  const originalMethod = 'POST';
  // test con OriginalMethod valida -> no exception
  it('Valid POST OriginalMethod', async () => {
    await expect(validateOriginalMethodHeader(originalMethod)).to.be.fulfilled;
  });

    const blankOriginalMethod = null;
    // test con OriginalMethod NON valorizzato -> exception
    it('should throw MISSING_ORIGINAL_METHOD', async () => {
        try {
          await validateOriginalMethodHeader(blankOriginalMethod);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.MISSING_ORIGINAL_METHOD);
        }
    });


    const unExpectedOriginalMethod = 'DELETE';
    // test con OriginalMethod NON atteso -> exception
    it('should throw UNEXPECTED_ORIGINAL_METHOD', async () => {
        try {
          await validateOriginalMethodHeader(unExpectedOriginalMethod);
        } catch (err) {
          expect(err).to.be.instanceOf(LollipopRequestContentValidationException);
          expect(err.errorCode).to.equal(VALIDATION_ERROR_CODES.UNEXPECTED_ORIGINAL_METHOD);
        }
    });

});