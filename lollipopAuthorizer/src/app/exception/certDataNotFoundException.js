class CertDataNotFoundException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'CertDataNotFoundException';
    this.errorCode = errorCode;
  }
}

export default CertDataNotFoundException;