const LollipopAssertionException = require('./lollipopAssertionException');

class LollipopAssertionNotFoundException extends LollipopAssertionException {
  constructor(errorCode, message) {
    super(errorCode, message);
  }
}

module.exports = LollipopAssertionNotFoundException;
