class InvalidInstantFormatException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'InvalidInstantFormatException';
    this.errorCode = errorCode;
  }
}

export default InvalidInstantFormatException;