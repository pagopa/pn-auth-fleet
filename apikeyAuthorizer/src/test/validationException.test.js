const { ValidationException } = require("../app/exception/validationException");
const expect = require("chai").expect;

describe("test ValidationException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new ValidationException(message);
    expect(exception.name).to.eq("ValidationException");
    expect(exception.message).to.eq("test");
  });
});
