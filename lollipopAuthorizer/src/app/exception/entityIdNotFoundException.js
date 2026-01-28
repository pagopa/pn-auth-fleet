class EntityIdNotFoundException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'EntityIdNotFoundException';
    this.errorCode = errorCode;
  }
}

export default EntityIdNotFoundException;