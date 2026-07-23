class LollipopValidationError extends Error {
  constructor(errorCode, message, cause) {
    super(message);

    this.name = "LollipopValidationError";
    this.errorCode = errorCode;

    if (cause) {
      this.cause = cause;
    }
  }
}

module.exports = LollipopValidationError;
