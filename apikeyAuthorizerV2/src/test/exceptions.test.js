import {
  ValidationException,
  KeyStatusException,
  ItemNotFoundException,
  TooManyItemsFoundException,
} from "../app/exceptions";
import { expect } from "chai";

describe("test ValidationException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new ValidationException(message);
    expect(exception.name).to.eq("ValidationException");
    expect(exception.message).to.eq("test");
  });
});

describe("test KeyStatusException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new KeyStatusException(message);
    expect(exception.name).to.eq("KeyStatusException");
    expect(exception.message).to.eq("test");
  });
});

describe("test ItemNotFoundException", () => {
  it("should set name", () => {
    const testKey = "testKey";
    const testTable = "testTable";
    const exception = new ItemNotFoundException(testKey, testTable);
    expect(exception.name).to.eq("ItemNotFoundException");
    expect(exception.message).to.eq(
      `Item with id = ${testKey} not found on table ${testTable}`
    );
  });
});

describe("test TooManyItemsFoundException", () => {
  it("should set name", () => {
    const testTable = "testTable";
    const exception = new TooManyItemsFoundException(testTable);
    expect(exception.name).to.eq("TooManyItemsFoundException");
    expect(exception.message).to.eq(
      `Too many items found on table ${testTable}`
    );
  });
});
