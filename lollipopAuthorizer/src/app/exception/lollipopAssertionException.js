class LollipopAssertionException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
  }
}

module.exports = LollipopAssertionException;