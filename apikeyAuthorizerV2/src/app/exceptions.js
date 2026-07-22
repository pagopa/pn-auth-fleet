class ValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationException";
  }
}

class AudienceValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = "AudienceValidationException";
  }
}

class KeyStatusException extends Error {
  constructor(message) {
    super(message);
    this.name = "KeyStatusException";
  }
}

class ItemNotFoundException extends Error {
  constructor(key, tableName) {
    super(`Item with id = ${key} not found on table ${tableName}`);
    this.name = "ItemNotFoundException";
  }
}

class JwksRetrievalException extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "JwksRetrievalException";
  }
}

class TooManyItemsFoundException extends Error {
  constructor(tableName) {
    super(`Too many items found on table ${tableName}`);
    this.name = "TooManyItemsFoundException";
  }
}

module.exports = {
  AudienceValidationException,
  ItemNotFoundException,
  JwksRetrievalException,
  KeyStatusException,
  TooManyItemsFoundException,
  ValidationException,
};
