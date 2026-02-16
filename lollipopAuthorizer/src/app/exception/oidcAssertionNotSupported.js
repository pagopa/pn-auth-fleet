import LollipopAssertionException from "./lollipopAssertionException.js";

class OidcAssertionNotSupported extends LollipopAssertionException {
  constructor(errorCode, message) {
    super(errorCode, message);
  }
}

export default OidcAssertionNotSupported;
