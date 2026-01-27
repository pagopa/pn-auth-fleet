class TagListSearchOutOfBoundException extends Error {

  constructor(errorCode, message) {
    super(message);
    this.name = 'TagListSearchOutOfBoundException';
    this.errorCode = errorCode;
  }
}

export default TagListSearchOutOfBoundException;