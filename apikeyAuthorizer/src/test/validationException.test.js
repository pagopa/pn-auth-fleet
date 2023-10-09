import { ValidationException } from "../app/exception/validationException";
import { expect } from "chai";

describe("test ValidationException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new ValidationException(message);
    expect(exception.name).to.eq("ValidationException");
    expect(exception.message).to.eq("test");
  });
});
