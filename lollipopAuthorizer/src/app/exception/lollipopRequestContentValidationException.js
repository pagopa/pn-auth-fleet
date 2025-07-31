class LollipopRequestContentValidationException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'LollipopRequestContentValidationException';
    this.errorCode = errorCode;
  }
}

module.exports = LollipopRequestContentValidationException;
