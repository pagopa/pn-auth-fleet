const LollipopAssertionException = require('./lollipopAssertionException');

class ErrorRetrievingAssertionException extends LollipopAssertionException {

  constructor(errorCode, message) {
    super(errorCode, message);
  }

}

module.exports = ErrorRetrievingAssertionException;
