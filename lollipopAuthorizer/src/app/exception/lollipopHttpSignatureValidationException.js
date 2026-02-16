class LollipopHttpSignatureValidationException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'lollipopHttpSignatureValidationException';
    this.errorCode = errorCode;
  }
}

export default LollipopHttpSignatureValidationException;
