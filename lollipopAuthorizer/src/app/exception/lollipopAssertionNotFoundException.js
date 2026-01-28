import LollipopAssertionException from "./lollipopAssertionException.js";

class LollipopAssertionNotFoundException extends LollipopAssertionException {
  constructor(errorCode, message) {
    super(errorCode, message);
  }
}

export default LollipopAssertionNotFoundException;
