class IllegalArgumentException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'IllegalArgumentException';
    this.errorCode = errorCode;
  }
}

export default IllegalArgumentException;