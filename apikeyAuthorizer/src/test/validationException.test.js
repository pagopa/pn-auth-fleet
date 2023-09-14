const validationException = require("../app/exception/validationException");
const expect = require("chai").expect;

describe("test ValidationException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new validationException(message);
    expect(exception.name).to.eq("ValidationException");
    expect(exception.message).to.eq("test");
  });
});
