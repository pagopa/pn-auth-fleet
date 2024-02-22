class AuthenticationError extends Error {

  meta = {}

  constructor(message, meta = {}) {
    super(message);
    this.name = "AuthenticationError";
    this.meta = meta;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      meta: this.meta
    }
  }
  
}


module.exports = AuthenticationError