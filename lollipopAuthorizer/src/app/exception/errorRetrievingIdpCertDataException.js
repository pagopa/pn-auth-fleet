class ErrorRetrievingIdpCertDataException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'ErrorRetrievingIdpCertDataException';
    this.errorCode = errorCode;
  }
}

const ErrorCode = {
    ENTITY_ID_FIELD_NOT_FOUND: 'ENTITY_ID_FIELD_NOT_FOUND',
    INSTANT_FIELD_NOT_FOUND: 'INSTANT_FIELD_NOT_FOUND',
    IDP_CERT_DATA_NOT_FOUND: 'IDP_CERT_DATA_NOT_FOUND'
};

module.exports = ErrorRetrievingIdpCertDataException;