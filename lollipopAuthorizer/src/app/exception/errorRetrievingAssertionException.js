import LollipopAssertionException from "./lollipopAssertionException.js";

class ErrorRetrievingAssertionException extends LollipopAssertionException {

  constructor(errorCode, message) {
    super(errorCode, message);
  }

}

export default ErrorRetrievingAssertionException;
