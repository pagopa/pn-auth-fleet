const LollipopAssertionException = require('./lollipopAssertionException');

class OidcAssertionNotSupported extends LollipopAssertionException {
  constructor(errorCode, message) {
    super(errorCode, message);
  }
}

module.exports = OidcAssertionNotSupported;
