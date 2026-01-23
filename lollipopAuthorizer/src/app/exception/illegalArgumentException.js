class IllegalArgumentException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'IllegalArgumentException';
    this.errorCode = errorCode;
  }
}

module.exports = IllegalArgumentException;