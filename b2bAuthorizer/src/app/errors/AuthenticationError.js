class AuthenticationError extends Error {

  meta = {}
  retriable = true // if false, the error doesn\'t allow a retry

  constructor(message, meta = {}, retriable = true) {
    super(message);
    this.name = "AuthenticationError";
    this.meta = meta;
    this.retriable = retriable;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      meta: this.meta,
      retriable: this.retriable
    }
  }
  
}


module.exports = AuthenticationError