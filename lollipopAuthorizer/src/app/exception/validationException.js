class ValidationException extends Error {
  constructor(message, detail) {
    super(detail ? `${message}: ${detail}` : message);
    this.name = "ValidationException";
  }
}

export default ValidationException;
