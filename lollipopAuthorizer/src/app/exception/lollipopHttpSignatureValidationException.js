class LollipopHttpSignatureValidationException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'lollipopHttpSignatureValidationException';
    this.errorCode = errorCode;
  }
}

module.exports = LollipopHttpSignatureValidationException;
