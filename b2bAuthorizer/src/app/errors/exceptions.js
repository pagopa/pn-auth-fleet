class ItemNotFoundException extends Error {
  constructor(tableName) {
    super(`VirtualKey not found on table ${tableName}`);
    this.name = "ItemNotFoundException";
  }
}

class TooManyItemsFoundException extends Error {
  constructor(tableName) {
    super(`Too many items found on table ${tableName}`);
    this.name = "TooManyItemsFoundException";
  }
}

class KeyStatusException extends Error {
  constructor(message) {
    super(message);
    this.name = "KeyStatusException";
  }
}

class ValidationException extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationException";
  }
}

module.exports = {
  ItemNotFoundException,
  TooManyItemsFoundException,
  ValidationException,
  KeyStatusException
};
