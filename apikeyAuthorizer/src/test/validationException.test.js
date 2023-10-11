const { expect } = require("chai");

const ValidationException = require("../app/exception/validationException.js");

describe("test ValidationException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new ValidationException(message);
    expect(exception.name).to.eq("ValidationException");
    expect(exception.message).to.eq("test");
  });
});
