class ApiException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'ApiException';
    this.errorCode = errorCode;
  }
}

export default ApiException;