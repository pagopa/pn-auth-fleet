class LollipopAssertionException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'LollipopAssertionException';
    this.errorCode = errorCode;
  }
}

module.exports = LollipopAssertionException;