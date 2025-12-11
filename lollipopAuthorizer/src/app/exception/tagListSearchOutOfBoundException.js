class TagListSearchOutOfBoundException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'TagListSearchOutOfBoundException';
    this.errorCode = errorCode;
  }
}

module.exports = TagListSearchOutOfBoundException;