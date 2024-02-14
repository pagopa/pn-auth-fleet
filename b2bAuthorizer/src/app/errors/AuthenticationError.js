class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
  }
}


module.exports = AuthenticationError