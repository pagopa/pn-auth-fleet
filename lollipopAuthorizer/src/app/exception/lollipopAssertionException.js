class LollipopAssertionException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
  }
}

export default LollipopAssertionException;